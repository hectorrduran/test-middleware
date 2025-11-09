/**
 * Configuración de roles predefinidos
 * 
 * Define aliases de roles que mapean a roles específicos de Keycloak.
 * Puedes personalizar estos mapeos según tu configuración de Keycloak.
 */

export const ROLE_ALIASES: Record<string, string[]> = {
  /**
   * Admin: Usuarios con privilegios administrativos completos
   * Incluye: admin, super-admin, system-admin
   */
  Admin: ['admin', 'super-admin', 'system-admin'],  // ← Quitado FBC_NATIONAL_COMMERCIAL_SUPPLIER_USER

  /**
   * Manager: Usuarios con privilegios de gestión
   * Incluye: manager, team-lead, supervisor
   */
  Manager: ['manager', 'team-lead', 'supervisor'],

  /**
   * Auditor: Usuarios con acceso de auditoría
   * Incluye: auditor, compliance-officer
   */
  Auditor: ['auditor', 'compliance-officer'],

  /**
   * Supplier: Usuarios proveedores
   * Incluye: FBC_NATIONAL_COMMERCIAL_SUPPLIER_USER
   */
  Supplier: ['FBC_NATIONAL_COMMERCIAL_SUPPLIER_USER'],

  /**
   * ALL: Cualquier usuario autenticado
   * No requiere roles específicos, solo token válido
   */
  ALL: [],
};

export type RoleAlias = keyof typeof ROLE_ALIASES;

/**
 * Resuelve un alias de rol a los roles de Keycloak correspondientes
 * 
 * @param alias - El alias del rol (Admin, Manager, Auditor, Supplier, ALL)
 * @returns Array de roles de Keycloak
 */
export function resolveRoleAlias(alias: string): string[] {
  if (alias in ROLE_ALIASES) {
    return [...ROLE_ALIASES[alias]];
  }
  // Si no es un alias, retornar el rol tal cual
  return [alias];
}

/**
 * Resuelve múltiples aliases/roles
 * 
 * @param aliases - Array de aliases o roles
 * @returns Array único de roles de Keycloak
 */
export function resolveRoleAliases(aliases: string[]): string[] {
  const resolvedRoles = aliases.flatMap(alias => resolveRoleAlias(alias));
  // Eliminar duplicados
  return [...new Set(resolvedRoles)];
}
