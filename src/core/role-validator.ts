/**
 * Validador de roles - Sin dependencias de frameworks
 */

import { DecodedToken, RoleValidationOptions, ValidationResult } from './types';
import { resolveRoleAliases } from './role-aliases';

/**
 * Obtiene los roles del token según el recurso especificado
 */
export function getUserRoles(
  decoded: DecodedToken,
  resource?: string
): string[] {
  if (resource && decoded.resource_access && decoded.resource_access[resource]) {
    return decoded.resource_access[resource].roles;
  }
  
  return decoded.realm_access?.roles || [];
}

/**
 * Valida si el usuario tiene los roles requeridos
 */
export function validateRoles(
  decoded: DecodedToken,
  options: RoleValidationOptions
): ValidationResult {
  // Si se requieren roles de realm
  if (options.requiredRealmRoles && options.requiredRealmRoles.length > 0) {
    const resolvedRoles = options.useAliases 
      ? resolveRoleAliases(options.requiredRealmRoles)
      : options.requiredRealmRoles;
    
    // Si el alias es 'ALL', permitir acceso directo
    if (options.requiredRealmRoles.includes('ALL')) {
      return { success: true, decoded };
    }
    
    const realmRoles = decoded.realm_access?.roles || [];
    const hasRequiredRole = resolvedRoles.some(role => realmRoles.includes(role));

    if (!hasRequiredRole) {
      return {
        success: false,
        error: {
          code: 'INSUFFICIENT_REALM_ROLES',
          message: `No tienes los roles requeridos en realm_access. Se requiere uno de: ${options.requiredRealmRoles.join(', ')}`,
          statusCode: 403
        }
      };
    }
    
    return { success: true, decoded };
  }

  // Si se requieren roles de recurso
  if (options.requiredResource) {
    // Verificar que el usuario tenga acceso al recurso
    if (!decoded.resource_access || !decoded.resource_access[options.requiredResource]) {
      return {
        success: false,
        error: {
          code: 'RESOURCE_ACCESS_DENIED',
          message: `No tienes acceso al recurso: ${options.requiredResource}`,
          statusCode: 403
        }
      };
    }

    // Si se especifican roles requeridos, validarlos
    if (options.requiredRoles && options.requiredRoles.length > 0) {
      const resolvedRoles = options.useAliases 
        ? resolveRoleAliases(options.requiredRoles)
        : options.requiredRoles;

      const resourceRoles = decoded.resource_access[options.requiredResource].roles;
      const hasRequiredRole = resolvedRoles.some(role => resourceRoles.includes(role));

      if (!hasRequiredRole) {
        return {
          success: false,
          error: {
            code: 'INSUFFICIENT_ROLES',
            message: `No tienes los roles necesarios en el recurso ${options.requiredResource}. Se requiere uno de: ${options.requiredRoles.join(', ')}`,
            statusCode: 403
          }
        };
      }
    }
    
    // Si no se especifican roles, solo con tener acceso al recurso es suficiente
    return { success: true, decoded };
  }

  return { success: true, decoded };
}

/**
 * Verifica si el usuario tiene un rol específico
 */
export function hasRole(
  decoded: DecodedToken,
  role: string,
  resource?: string
): boolean {
  const roles = getUserRoles(decoded, resource);
  return roles.includes(role);
}

/**
 * Verifica si el usuario tiene alguno de los roles especificados
 */
export function hasAnyRole(
  decoded: DecodedToken,
  roles: string[],
  resource?: string
): boolean {
  const userRoles = getUserRoles(decoded, resource);
  return roles.some(role => userRoles.includes(role));
}

/**
 * Verifica si el usuario tiene todos los roles especificados
 */
export function hasAllRoles(
  decoded: DecodedToken,
  roles: string[],
  resource?: string
): boolean {
  const userRoles = getUserRoles(decoded, resource);
  return roles.every(role => userRoles.includes(role));
}
