/**
 * Decoradores de NestJS - Usan los mismos metadata keys del guard
 */

import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const RESOURCE_KEY = 'resource';
export const VALIDATE_TAX_ID_KEY = 'validateTaxId';
export const REALM_ROLES_KEY = 'realmRoles';
export const USE_ALIASES_KEY = 'useAliases';

/**
 * Decorator para requerir roles específicos en un recurso
 * @param roles Array de roles requeridos
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Decorator para especificar el recurso requerido
 * @param resource Nombre del recurso en resource_access
 */
export const RequireResource = (resource: string) => SetMetadata(RESOURCE_KEY, resource);

/**
 * Decorator para habilitar validación de tax_id
 * @param options Opciones de validación (paramName, paramSource, bypassRoles)
 */
export const ValidateTaxId = (options?: {
  paramName?: string;
  paramSource?: 'path' | 'query' | 'body' | 'header';
  bypassRoles?: string[];
  resource?: string;
}) => SetMetadata(VALIDATE_TAX_ID_KEY, options || true);

/**
 * Decorator para requerir roles en realm_access
 * @param roles Array de roles requeridos en realm_access
 */
export const RealmRoles = (...roles: string[]) => SetMetadata(REALM_ROLES_KEY, roles);

/**
 * Decorator para habilitar resolución de aliases de roles
 */
export const UseRoleAliases = () => SetMetadata(USE_ALIASES_KEY, true);
