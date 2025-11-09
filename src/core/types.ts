/**
 * Tipos compartidos - Sin dependencias de frameworks
 */

/**
 * Estructura de vendor en vendors-taxs
 */
export interface VendorTax {
  name?: string;
  taxId: string;
  operation?: Array<{
    businessUnit: string;
    country: string[];
  }>;
  country?: string;
}

export interface DecodedToken {
  sub: string;
  email?: string;
  name?: string;
  preferred_username?: string;
  
  // Tax ID puede venir en diferentes formatos:
  tax_id?: string;  // Formato simple: "76.123.456-7"
  'vendors-taxs'?: VendorTax[];  // Formato Falabella: [{ taxId: "10214564-K", ... }]
  
  resource_access?: {
    [resource: string]: {
      roles: string[];
    };
  };
  realm_access?: {
    roles: string[];
  };
  iss?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
}

export interface ValidationOptions {
  // Opciones de JWT
  jwtSecret?: string;
  publicKey?: string;
  skipVerification?: boolean;
  issuer?: string;
  audience?: string | string[];
  
  // Opciones de validación
  requiredResource?: string;
  requiredRoles?: string[];
  validateRealmRoles?: boolean;
  
  // Opciones de Tax ID
  taxIdBypassRoles?: string[];
}

export interface ValidationResult {
  success: boolean;
  decoded?: DecodedToken;
  error?: {
    code: string;
    message: string;
    statusCode: number;
  };
}

export interface RoleValidationOptions {
  requiredRoles?: string[];
  requiredResource?: string;
  requiredRealmRoles?: string[];
  useAliases?: boolean;
}

export interface TaxIdValidationOptions {
  bypassRoles?: string[];
  resource?: string;
  paramName?: string;  // Nombre del parámetro en el request (ej: 'rut', 'companyId', 'vendorId')
  paramSource?: 'path' | 'query' | 'body' | 'header';  // Fuente del parámetro
}
