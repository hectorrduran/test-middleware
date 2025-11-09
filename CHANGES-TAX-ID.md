# Resumen de Cambios - Validación de TaxId

## Funcionalidad Implementada

Se agregó validación de `taxId` para endpoints que requieren verificar el acceso a proveedores específicos basándose en el campo `vendors-taxs` del token JWT de Keycloak.

## Archivos Modificados

### 1. `/src/interfaces/token-validate-options.interface.ts`
**Cambios:**
- Agregado interfaz `VendorTax` con campos: `taxId`, `operation`, `country`
- Agregado campo `'vendors-taxs'?: VendorTax[]` a `DecodedToken`
- Agregado opciones `validateTaxId?: boolean` y `taxIdBypassRoles?: string[]` a `TokenValidateOptions`

### 2. `/src/decorators/roles.decorator.ts`
**Cambios:**
- Agregado constante `VALIDATE_TAX_ID_KEY` para metadata
- Agregado decorador `@ValidateTaxId()` para marcar endpoints que requieren validación de taxId

### 3. `/src/guards/roles.guard.ts`
**Cambios:**
- Importado `VALIDATE_TAX_ID_KEY`, `validateTaxIdAccess`, `extractTaxIdFromRequest`
- Agregado campo `taxIdBypassRoles: string[]` al constructor
- Agregada lógica de validación de taxId en el método `canActivate()`:
  - Extrae taxId de la request (params, query, body, headers)
  - Valida usando `validateTaxIdAccess()` con bypass de roles
  - Lanza error 401 si la validación falla

### 4. `/src/index.ts`
**Cambios:**
- Agregado export de `./utils/tax-id-validator` para exponer los helpers públicamente

## Archivos Nuevos

### 1. `/src/utils/tax-id-validator.ts`
**Contenido:**
- `validateTaxIdAccess(token, taxId, bypassRoles)`: Valida acceso al taxId con lógica de bypass
- `extractTaxIdFromRequest(req)`: Extrae taxId de params, query, body o headers
- `getUserTaxIds(token)`: Retorna array de taxIds del usuario
- `normalizeTaxId(taxId)`: Normaliza taxId (trim, uppercase)

### 2. `/example/tax-id-validation-example.controller.ts`
**Contenido:**
- Controlador de ejemplo con 4 escenarios de validación de taxId
- Documentación inline de cada caso de uso

### 3. `/TAX-ID-VALIDATION.md`
**Contenido:**
- Guía completa de validación de taxId
- Configuración y ejemplos de uso
- Lógica de bypass explicada
- Helpers disponibles
- FAQ

## Documentación Actualizada

### `/README.md`
**Secciones agregadas/modificadas:**
- **Sección 4**: "Validación de TaxId (Vendor/Supplier)" con ejemplos de uso
- **Opciones de Configuración**: Agregadas opciones `validateTaxId` y `taxIdBypassRoles`
- **Formato del Token**: Agregado campo `vendors-taxs` con estructura completa
- **Errores**: Agregados mensajes de error relacionados con taxId

## Lógica de Validación

### Regla Principal
- Si el usuario tiene **SOLO** el rol `FBC_NATIONAL_COMMERCIAL_SUPPLIER_USER` en `realm_access`, debe tener el `taxId` en `vendors-taxs`
- Si el usuario tiene **otros roles** en `realm_access`, la validación se omite (bypass)

### Flujo de Validación
1. Se verifica si el endpoint tiene `@ValidateTaxId()`
2. Se extrae el taxId de la request (params > query > body > headers)
3. Si no hay taxId, se rechaza con error 401
4. Se valida usando `validateTaxIdAccess()`:
   - Si tiene roles de bypass → acceso permitido ✅
   - Si tiene SOLO `FBC_NATIONAL_COMMERCIAL_SUPPLIER_USER`:
     - Verifica si taxId está en `vendors-taxs` → acceso permitido/rechazado
   - Si no tiene roles → acceso rechazado ❌

## Configuración de Uso

```typescript
// En app.module.ts
TokenValidateModule.forRoot({
  publicKey: process.env.KEYCLOAK_PUBLIC_KEY,
  skipVerification: true,
  taxIdBypassRoles: ['admin', 'manager'], // Opcional
})

// En controlador
@Get(':taxId/orders')
@RequireResource('bff-suppliers')
@Roles('view-orders')
@ValidateTaxId() // Habilita validación
getOrders(@Param('taxId') taxId: string) {
  return { orders: [...] };
}
```

## Testing

La librería compila correctamente con `npm run build` sin errores.

## Helpers Públicos

Los siguientes helpers están disponibles para uso externo:

```typescript
import { 
  validateTaxIdAccess, 
  getUserTaxIds, 
  normalizeTaxId,
  extractTaxIdFromRequest 
} from '@falabella/middleware-token-validate';
```

## Compatibilidad

- ✅ NestJS (Guards + Decorators)
- ✅ Express (Middleware con adapter)
- ✅ Cloud Endpoints (skipVerification)
- ✅ Keycloak tokens con resource_access + vendors-taxs
