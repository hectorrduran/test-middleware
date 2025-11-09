/**
 * Validador de Tax ID - Sin dependencias de frameworks
 */

import { DecodedToken, VendorTax, TaxIdValidationOptions, ValidationResult } from './types';
import { resolveRoleAliases } from './role-aliases';

/**
 * Normaliza un taxId para comparación
 */
function normalizeTaxId(taxId: string): string {
  if (!taxId) return '';
  return taxId
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/\./g, '');  // Eliminar puntos también
}

/**
 * Extrae todos los taxIds del token (soporta múltiples formatos)
 */
function extractTaxIdsFromToken(decoded: DecodedToken): string[] {
  const taxIds: string[] = [];

  // Formato 1: tax_id simple (string)
  if (decoded.tax_id) {
    taxIds.push(normalizeTaxId(decoded.tax_id));
  }

  // Formato 2: vendors-taxs (array de objetos Falabella)
  if (decoded['vendors-taxs'] && Array.isArray(decoded['vendors-taxs'])) {
    decoded['vendors-taxs'].forEach((vendor: VendorTax) => {
      if (vendor.taxId) {
        taxIds.push(normalizeTaxId(vendor.taxId));
      }
    });
  }

  return taxIds;
}

/**
 * Obtiene los roles del usuario según el recurso
 */
function getUserRolesForBypass(
  decoded: DecodedToken,
  resource?: string
): string[] {
  if (resource && decoded.resource_access && decoded.resource_access[resource]) {
    return decoded.resource_access[resource].roles;
  }
  return decoded.realm_access?.roles || [];
}

/**
 * Verifica si el usuario tiene roles de bypass
 */
function hasBypassRole(
  decoded: DecodedToken,
  bypassRoles: string[],
  resource?: string
): boolean {
  const userRoles = getUserRolesForBypass(decoded, resource);
  
  // Resolver aliases a roles reales
  const resolvedBypassRoles = resolveRoleAliases(bypassRoles);
  
  return resolvedBypassRoles.some(role => userRoles.includes(role));
}

/**
 * Extrae taxId de diferentes fuentes del request
 */
export function extractTaxId(
  request: {
    params?: any;
    query?: any;
    body?: any;
    headers?: any;
  },
  paramName?: string,
  paramSource?: 'path' | 'query' | 'body' | 'header'
): string | null {
  // Si se especifica paramName y paramSource, buscar solo ahí
  if (paramName && paramSource) {
    switch (paramSource) {
      case 'path':
        return request.params?.[paramName] || null;
      case 'query':
        return request.query?.[paramName] || null;
      case 'body':
        return request.body?.[paramName] || null;
      case 'header':
        return request.headers?.[paramName.toLowerCase()] || null;
    }
  }

  // Si solo se especifica paramName, buscar en todas las fuentes
  if (paramName) {
    if (request.params?.[paramName]) return request.params[paramName];
    if (request.query?.[paramName]) return request.query[paramName];
    if (request.body?.[paramName]) return request.body[paramName];
    if (request.headers?.[paramName.toLowerCase()]) return request.headers[paramName.toLowerCase()];
  }

  // Comportamiento por defecto: buscar taxId y tax_id
  // Buscar en params (ej: /api/vendors/:taxId o :tax_id)
  if (request.params?.taxId) return request.params.taxId;
  if (request.params?.tax_id) return request.params.tax_id;

  // Buscar en query (ej: /api/vendors?taxId=xxx)
  if (request.query?.taxId) return request.query.taxId;
  if (request.query?.tax_id) return request.query.tax_id;

  // Buscar en body (ej: POST /api/vendors con { taxId: 'xxx' })
  if (request.body?.taxId) return request.body.taxId;
  if (request.body?.tax_id) return request.body.tax_id;

  // Buscar en headers personalizados
  if (request.headers?.['x-tax-id']) return request.headers['x-tax-id'];

  return null;
}

/**
 * Valida el acceso al taxId
 */
export function validateTaxId(
  decoded: DecodedToken,
  taxId: string,
  options?: TaxIdValidationOptions
): ValidationResult {
  // Normalizar taxId solicitado
  const normalizedRequestedTaxId = normalizeTaxId(taxId);

  if (!normalizedRequestedTaxId) {
    return {
      success: false,
      error: {
        code: 'TAX_ID_NOT_PROVIDED',
        message: 'tax_id no proporcionado en la solicitud',
        statusCode: 400
      }
    };
  }

  // Verificar bypass roles
  if (options?.bypassRoles && options.bypassRoles.length > 0) {
    if (hasBypassRole(decoded, options.bypassRoles, options.resource)) {
      return { success: true, decoded };
    }
  }

  // Extraer todos los taxIds del token (soporta múltiples formatos)
  const tokenTaxIds = extractTaxIdsFromToken(decoded);

  if (tokenTaxIds.length === 0) {
    return {
      success: false,
      error: {
        code: 'TAX_ID_NOT_IN_TOKEN',
        message: 'El token no contiene tax_id o vendors-taxs válidos',
        statusCode: 403
      }
    };
  }

  // Verificar si el tax_id solicitado está en la lista del usuario
  const hasAccess = tokenTaxIds.includes(normalizedRequestedTaxId);
  
  if (!hasAccess) {
    return {
      success: false,
      error: {
        code: 'TAX_ID_ACCESS_DENIED',
        message: `No tienes acceso a este tax_id. Tax IDs disponibles: ${tokenTaxIds.join(', ')}`,
        statusCode: 403
      }
    };
  }

  return { success: true, decoded };
}

/**
 * Valida acceso usando vendors-taxs (legacy - ahora unificado con validateTaxId)
 * Esta función ahora usa la misma lógica que validateTaxId
 */
export function validateVendorsTaxs(
  decoded: DecodedToken,
  taxId: string,
  options?: TaxIdValidationOptions
): ValidationResult {
  // Usar la misma lógica de validateTaxId
  return validateTaxId(decoded, taxId, options);
}

/**
 * Obtiene todos los taxIds disponibles para el usuario
 */
export function getUserTaxIds(decoded: DecodedToken): string[] {
  const taxIds: string[] = [];

  // Tax ID directo
  if (decoded.tax_id) {
    taxIds.push(decoded.tax_id);
  }

  // Vendors-taxs
  if (decoded['vendors-taxs'] && Array.isArray(decoded['vendors-taxs'])) {
    decoded['vendors-taxs'].forEach(vendor => {
      const taxIdValue = typeof vendor === 'string' ? vendor : (vendor as any).taxId;
      if (taxIdValue) {
        taxIds.push(taxIdValue);
      }
    });
  }

  return [...new Set(taxIds)]; // Eliminar duplicados
}
