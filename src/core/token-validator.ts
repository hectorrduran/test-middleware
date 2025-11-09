/**
 * Validador de tokens JWT - Sin dependencias de frameworks
 */

import * as jwt from 'jsonwebtoken';
import { DecodedToken, ValidationOptions, ValidationResult } from './types';

/**
 * Extrae el token del header Authorization
 */
export function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1] || null;
}

/**
 * Solo decodifica el token sin validar la firma
 * Útil cuando la validación JWT ya fue realizada por una capa anterior (API Gateway, Cloud Endpoints, etc.)
 */
export function decodeTokenWithoutValidation(token: string): ValidationResult {
  try {
    const decoded = jwt.decode(token, { complete: false }) as DecodedToken;
    
    if (!decoded) {
      return {
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Token no se pudo decodificar',
          statusCode: 401
        }
      };
    }

    return {
      success: true,
      decoded
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al decodificar el token';
    return {
      success: false,
      error: {
        code: 'TOKEN_DECODE_FAILED',
        message,
        statusCode: 401
      }
    };
  }
}

/**
 * Verifica y decodifica un token JWT (validando la firma)
 */
export function verifyAndDecodeToken(
  token: string,
  options: ValidationOptions
): ValidationResult {
  try {
    // Validar que al menos una opción de verificación esté presente
    if (!options.jwtSecret && !options.publicKey && !options.skipVerification) {
      return {
        success: false,
        error: {
          code: 'INVALID_CONFIG',
          message: 'Debes proporcionar jwtSecret, publicKey, o skipVerification=true',
          statusCode: 500
        }
      };
    }

    let decoded: DecodedToken;

    if (options.skipVerification) {
      // SOLO PARA DESARROLLO: decodificar sin verificar
      decoded = jwt.decode(token) as DecodedToken;
      if (!decoded) {
        return {
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Token no se pudo decodificar',
            statusCode: 401
          }
        };
      }
    } else {
      // Preparar opciones de verificación
      const verifyOptions: jwt.VerifyOptions = {};
      
      if (options.issuer) {
        verifyOptions.issuer = options.issuer;
      }
      
      if (options.audience) {
        verifyOptions.audience = options.audience as any;
      }

      // Verificar con secret o public key
      const secretOrPublicKey = options.publicKey || options.jwtSecret;
      if (!secretOrPublicKey) {
        return {
          success: false,
          error: {
            code: 'INVALID_CONFIG',
            message: 'No se proporcionó jwtSecret o publicKey',
            statusCode: 500
          }
        };
      }
      
      decoded = jwt.verify(token, secretOrPublicKey, verifyOptions) as DecodedToken;
    }

    return {
      success: true,
      decoded
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al verificar el token';
    return {
      success: false,
      error: {
        code: 'TOKEN_VERIFICATION_FAILED',
        message,
        statusCode: 401
      }
    };
  }
}

/**
 * Valida si el token tiene acceso a recursos
 */
export function validateResourceAccess(decoded: DecodedToken): ValidationResult {
  // Verificar si el token contiene resource_access
  if (!decoded.resource_access || Object.keys(decoded.resource_access).length === 0) {
    // Si no hay resource_access, verificar realm_access
    if (!decoded.realm_access || !decoded.realm_access.roles || decoded.realm_access.roles.length === 0) {
      return {
        success: false,
        error: {
          code: 'NO_RESOURCE_ACCESS',
          message: 'El token no contiene acceso a recursos válidos',
          statusCode: 401
        }
      };
    }
  }
  
  return { success: true, decoded };
}

/**
 * Valida acceso a un recurso específico
 */
export function validateSpecificResource(
  decoded: DecodedToken,
  requiredResource: string
): ValidationResult {
  const hasResourceAccess = decoded.resource_access && 
                            decoded.resource_access[requiredResource];

  if (!hasResourceAccess) {
    return {
      success: false,
      error: {
        code: 'RESOURCE_ACCESS_DENIED',
        message: `No tienes acceso al recurso: ${requiredResource}`,
        statusCode: 403
      }
    };
  }

  return { success: true, decoded };
}

/**
 * Valida roles en un recurso específico
 */
export function validateResourceRoles(
  decoded: DecodedToken,
  requiredResource: string,
  requiredRoles: string[]
): ValidationResult {
  if (!decoded.resource_access || !decoded.resource_access[requiredResource]) {
    return {
      success: false,
      error: {
        code: 'RESOURCE_ACCESS_DENIED',
        message: `No tienes acceso al recurso: ${requiredResource}`,
        statusCode: 403
      }
    };
  }

  const resourceRoles = decoded.resource_access[requiredResource].roles;
  const hasRequiredRole = requiredRoles.some(role => resourceRoles.includes(role));

  if (!hasRequiredRole) {
    return {
      success: false,
      error: {
        code: 'INSUFFICIENT_ROLES',
        message: `No tienes los roles necesarios en el recurso ${requiredResource}. Se requiere uno de: ${requiredRoles.join(', ')}`,
        statusCode: 403
      }
    };
  }

  return { success: true, decoded };
}

/**
 * Valida roles en realm_access
 */
export function validateRealmRoles(
  decoded: DecodedToken,
  requiredRealmRoles: string[]
): ValidationResult {
  const realmRoles = decoded.realm_access?.roles || [];
  const hasRequiredRealmRole = requiredRealmRoles.some(role => realmRoles.includes(role));

  if (!hasRequiredRealmRole) {
    return {
      success: false,
      error: {
        code: 'INSUFFICIENT_REALM_ROLES',
        message: `No tienes los roles requeridos en realm_access. Se requiere uno de: ${requiredRealmRoles.join(', ')}`,
        statusCode: 403
      }
    };
  }

  return { success: true, decoded };
}

/**
 * Decodifica el token y valida roles/permisos sin verificar la firma JWT
 * Útil cuando la validación JWT ya fue realizada por una capa anterior
 */
export function decodeAndValidatePermissions(
  authHeader: string | undefined,
  options: ValidationOptions
): ValidationResult {
  // 1. Extraer token
  const token = extractToken(authHeader);
  if (!token) {
    return {
      success: false,
      error: {
        code: 'TOKEN_NOT_PROVIDED',
        message: 'Token no proporcionado',
        statusCode: 401
      }
    };
  }

  // 2. Solo decodificar (sin validar firma)
  const decodeResult = decodeTokenWithoutValidation(token);
  if (!decodeResult.success || !decodeResult.decoded) {
    return decodeResult;
  }

  const decoded = decodeResult.decoded;

  // 3. Validar acceso a recursos general
  const resourceAccessResult = validateResourceAccess(decoded);
  if (!resourceAccessResult.success) {
    return resourceAccessResult;
  }

  // 4. Validar recurso específico si se requiere
  if (options.requiredResource) {
    const specificResourceResult = validateSpecificResource(decoded, options.requiredResource);
    if (!specificResourceResult.success) {
      return specificResourceResult;
    }

    // 5. Validar roles en el recurso si se especifican
    if (options.requiredRoles && options.requiredRoles.length > 0) {
      const rolesResult = validateResourceRoles(decoded, options.requiredResource, options.requiredRoles);
      if (!rolesResult.success) {
        return rolesResult;
      }
    }
  }

  // 6. Validar realm roles si está habilitado
  if (options.validateRealmRoles && options.requiredRoles && options.requiredRoles.length > 0) {
    const realmResult = validateRealmRoles(decoded, options.requiredRoles);
    if (!realmResult.success) {
      return realmResult;
    }
  }

  return {
    success: true,
    decoded
  };
}

/**
 * Validación completa de token con todas las opciones (incluye validación de firma JWT)
 */
export function validateToken(
  authHeader: string | undefined,
  options: ValidationOptions
): ValidationResult {
  // 1. Extraer token
  const token = extractToken(authHeader);
  if (!token) {
    return {
      success: false,
      error: {
        code: 'TOKEN_NOT_PROVIDED',
        message: 'Token no proporcionado',
        statusCode: 401
      }
    };
  }

  // 2. Verificar y decodificar token
  const verifyResult = verifyAndDecodeToken(token, options);
  if (!verifyResult.success || !verifyResult.decoded) {
    return verifyResult;
  }

  const decoded = verifyResult.decoded;

  // 3. Validar acceso a recursos general
  const resourceAccessResult = validateResourceAccess(decoded);
  if (!resourceAccessResult.success) {
    return resourceAccessResult;
  }

  // 4. Validar recurso específico si se requiere
  if (options.requiredResource) {
    const specificResourceResult = validateSpecificResource(decoded, options.requiredResource);
    if (!specificResourceResult.success) {
      return specificResourceResult;
    }

    // 5. Validar roles en el recurso si se especifican
    if (options.requiredRoles && options.requiredRoles.length > 0) {
      const rolesResult = validateResourceRoles(decoded, options.requiredResource, options.requiredRoles);
      if (!rolesResult.success) {
        return rolesResult;
      }
    }
  }

  // 6. Validar realm roles si está habilitado
  if (options.validateRealmRoles && options.requiredRoles && options.requiredRoles.length > 0) {
    const realmResult = validateRealmRoles(decoded, options.requiredRoles);
    if (!realmResult.success) {
      return realmResult;
    }
  }

  return {
    success: true,
    decoded
  };
}
