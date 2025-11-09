/**
 * Adaptadores de Express - Usan el core puro
 */

import { Request, Response, NextFunction } from 'express';
import { 
  validateToken,
  decodeAndValidatePermissions,
  validateRoles, 
  validateTaxId,
  extractTaxId,
  ValidationOptions,
  RoleValidationOptions,
  TaxIdValidationOptions
} from '../core';

/**
 * Middleware de Express para solo decodificar el token y validar permisos
 * NO valida la firma JWT (asume que ya fue validada por una capa anterior)
 * Útil cuando usas API Gateway, Cloud Endpoints, etc.
 */
export function createDecodeMiddleware(options: ValidationOptions = {}) {
  return function decodeMiddleware(req: Request, res: Response, next: NextFunction) {
    const result = decodeAndValidatePermissions(req.headers.authorization, options);

    if (!result.success) {
      return res.status(result.error?.statusCode || 401).json({
        statusCode: result.error?.statusCode || 401,
        message: result.error?.message || 'No autorizado',
        error: result.error?.code || 'Unauthorized'
      });
    }

    // Adjuntar usuario decodificado al request
    (req as any).user = result.decoded;
    next();
  };
}

/**
 * Middleware de Express para validar tokens JWT (incluye validación de firma)
 */
export function createTokenMiddleware(options: ValidationOptions) {
  return function tokenMiddleware(req: Request, res: Response, next: NextFunction) {
    const result = validateToken(req.headers.authorization, options);

    if (!result.success) {
      return res.status(result.error?.statusCode || 401).json({
        statusCode: result.error?.statusCode || 401,
        message: result.error?.message || 'No autorizado',
        error: result.error?.code || 'Unauthorized'
      });
    }

    // Adjuntar usuario decodificado al request
    (req as any).user = result.decoded;
    next();
  };
}

/**
 * Middleware de Express para validar roles
 * Debe usarse después del middleware de token
 */
export function createRolesMiddleware(
  roles?: string[] | string,  // roles es opcional ahora
  resource?: string,
  useAliases = false
) {
  return function rolesMiddleware(req: Request, res: Response, next: NextFunction) {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({
        statusCode: 401,
        message: 'Token no validado. Asegúrate de usar el middleware de token primero.',
        error: 'Unauthorized'
      });
    }

    // Si roles es un string (resource), ajustar parámetros
    const actualRoles = Array.isArray(roles) ? roles : undefined;
    const actualResource = typeof roles === 'string' ? roles : resource;

    const roleOptions: RoleValidationOptions = {
      requiredRoles: actualRoles,
      requiredResource: actualResource,
      useAliases
    };

    const result = validateRoles(user, roleOptions);

    if (!result.success) {
      return res.status(result.error?.statusCode || 403).json({
        statusCode: result.error?.statusCode || 403,
        message: result.error?.message || 'Acceso denegado',
        error: result.error?.code || 'Forbidden'
      });
    }

    next();
  };
}

/**
 * Middleware para validar solo acceso a un recurso (sin validar roles específicos)
 * Útil cuando solo necesitas verificar que el usuario tenga acceso al recurso
 */
export function createResourceAccessMiddleware(resource: string) {
  return createRolesMiddleware(undefined, resource, false);
}

/**
 * Middleware de Express para validar roles de realm
 */
export function createRealmRolesMiddleware(
  roles: string[],
  useAliases = false
) {
  return function realmRolesMiddleware(req: Request, res: Response, next: NextFunction) {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({
        statusCode: 401,
        message: 'Token no validado. Asegúrate de usar el middleware de token primero.',
        error: 'Unauthorized'
      });
    }

    const result = validateRoles(user, {
      requiredRealmRoles: roles,
      useAliases
    });

    if (!result.success) {
      return res.status(result.error?.statusCode || 403).json({
        statusCode: result.error?.statusCode || 403,
        message: result.error?.message || 'Acceso denegado',
        error: result.error?.code || 'Forbidden'
      });
    }

    next();
  };
}

/**
 * Middleware de Express para validar Tax ID
 */
export function createTaxIdMiddleware(options?: TaxIdValidationOptions) {
  return function taxIdMiddleware(req: Request, res: Response, next: NextFunction) {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({
        statusCode: 401,
        message: 'Token no validado. Asegúrate de usar el middleware de token primero.',
        error: 'Unauthorized'
      });
    }

    // Extraer tax_id usando paramName y paramSource si están especificados
    const taxIdFromRequest = extractTaxId(
      req,
      options?.paramName,
      options?.paramSource
    );
    
    if (!taxIdFromRequest) {
      const paramInfo = options?.paramName 
        ? `'${options.paramName}'${options.paramSource ? ` en ${options.paramSource}` : ''}`
        : 'tax_id';
      
      return res.status(400).json({
        statusCode: 400,
        message: `Parámetro ${paramInfo} no proporcionado en la solicitud`,
        error: 'Bad Request'
      });
    }

    const result = validateTaxId(user, taxIdFromRequest, options);

    if (!result.success) {
      return res.status(result.error?.statusCode || 403).json({
        statusCode: result.error?.statusCode || 403,
        message: result.error?.message || 'Acceso denegado',
        error: result.error?.code || 'Forbidden'
      });
    }

    next();
  };
}

/**
 * Middleware combinado: token + roles + tax_id (opcional)
 * Útil para endpoints complejos
 */
export function createProtectedMiddleware(
  tokenOptions: ValidationOptions,
  roleOptions?: RoleValidationOptions,
  taxIdOptions?: TaxIdValidationOptions
) {
  return function protectedMiddleware(req: Request, res: Response, next: NextFunction) {
    // 1. Validar token
    const tokenResult = validateToken(req.headers.authorization, tokenOptions);
    if (!tokenResult.success) {
      return res.status(tokenResult.error?.statusCode || 401).json({
        statusCode: tokenResult.error?.statusCode || 401,
        message: tokenResult.error?.message || 'No autorizado',
        error: tokenResult.error?.code || 'Unauthorized'
      });
    }

    const user = tokenResult.decoded!;
    (req as any).user = user;

    // 2. Validar roles si se especifican
    if (roleOptions) {
      const rolesResult = validateRoles(user, roleOptions);
      if (!rolesResult.success) {
        return res.status(rolesResult.error?.statusCode || 403).json({
          statusCode: rolesResult.error?.statusCode || 403,
          message: rolesResult.error?.message || 'Acceso denegado',
          error: rolesResult.error?.code || 'Forbidden'
        });
      }
    }

    // 3. Validar tax_id si se especifican opciones
    if (taxIdOptions) {
      const taxIdFromRequest = extractTaxId(req);
      if (taxIdFromRequest) {
        const taxIdResult = validateTaxId(user, taxIdFromRequest, taxIdOptions);
        if (!taxIdResult.success) {
          return res.status(taxIdResult.error?.statusCode || 403).json({
            statusCode: taxIdResult.error?.statusCode || 403,
            message: taxIdResult.error?.message || 'Acceso denegado',
            error: taxIdResult.error?.code || 'Forbidden'
          });
        }
      }
    }

    next();
  };
}
