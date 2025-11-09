# Guía de Validación de TaxId

Esta guía explica cómo usar la validación de `taxId` para endpoints que requieren verificar el acceso a proveedores específicos.

## ¿Qué es la validación de TaxId?

La validación de `taxId` permite verificar que un usuario tiene acceso a un proveedor específico basándose en el array `vendors-taxs` del token JWT de Keycloak.

### Caso de Uso

Imagina un sistema donde:
- Los proveedores (suppliers) solo pueden ver/editar sus propios datos
- Los administradores pueden ver/editar cualquier proveedor
- Cada proveedor tiene un `taxId` único (RUT en Chile)

## Configuración

### 1. Configurar el módulo

```typescript
import { Module } from '@nestjs/common';
import { TokenValidateModule } from '@falabella/middleware-token-validate';

@Module({
  imports: [
    TokenValidateModule.forRoot({
      publicKey: process.env.KEYCLOAK_PUBLIC_KEY,
      skipVerification: true, // Si Cloud Endpoints ya validó el token
      taxIdBypassRoles: ['admin', 'manager', 'super-user'], // Roles que pueden ver cualquier taxId
    }),
  ],
})
export class AppModule {}
```

### 2. Usar en controladores

```typescript
import { Controller, Get, Param } from '@nestjs/common';
import { RequireResource, Roles, ValidateTaxId } from '@falabella/middleware-token-validate';

@Controller('vendors')
export class VendorController {
  
  @Get(':taxId/orders')
  @RequireResource('bff-suppliers')
  @Roles('view-orders')
  @ValidateTaxId() // Habilita la validación de taxId
  getOrders(@Param('taxId') taxId: string) {
    // Solo se ejecuta si el usuario tiene acceso al taxId
    return { orders: [...], taxId };
  }
}
```

## Estructura del Token

El token debe incluir el campo `vendors-taxs` con el siguiente formato:

```json
{
  "sub": "user-id",
  "email": "proveedor@empresa.cl",
  "realm_access": {
    "roles": ["FBC_NATIONAL_COMMERCIAL_SUPPLIER_USER"]
  },
  "vendors-taxs": [
    {
      "taxId": "77123456-7",
      "operation": [
        {
          "businessUnit": "SODIMAC",
          "country": ["CL", "PE"]
        }
      ],
      "country": "CL"
    },
    {
      "taxId": "12345678-9",
      "country": "CL"
    }
  ]
}
```

## Lógica de Validación

### Regla de Bypass

La validación de `taxId` se **omite** (bypass) si el usuario tiene roles en `realm_access` **diferentes** a `FBC_NATIONAL_COMMERCIAL_SUPPLIER_USER`.

**Ejemplos:**

#### Caso 1: Usuario con SOLO rol de supplier
```json
{
  "realm_access": {
    "roles": ["FBC_NATIONAL_COMMERCIAL_SUPPLIER_USER", "offline_access"]
  },
  "vendors-taxs": [
    { "taxId": "77123456-7", "country": "CL" }
  ]
}
```

**Comportamiento:**
- ✅ Puede acceder a `/vendors/77123456-7/orders`
- ❌ NO puede acceder a `/vendors/12345678-9/orders` (taxId no está en su lista)

#### Caso 2: Usuario con rol de admin
```json
{
  "realm_access": {
    "roles": ["admin", "FBC_NATIONAL_COMMERCIAL_SUPPLIER_USER"]
  },
  "vendors-taxs": [
    { "taxId": "77123456-7", "country": "CL" }
  ]
}
```

**Comportamiento:**
- ✅ Puede acceder a `/vendors/77123456-7/orders`
- ✅ TAMBIÉN puede acceder a `/vendors/12345678-9/orders` (bypass por rol admin)
- ✅ Puede acceder a **cualquier** taxId

### Roles de Bypass Predeterminados

Por defecto, estos roles **NO** requieren validación de taxId:
- Cualquier rol en `realm_access` excepto `FBC_NATIONAL_COMMERCIAL_SUPPLIER_USER`

Puedes personalizar la lista con `taxIdBypassRoles`:

```typescript
TokenValidateModule.forRoot({
  publicKey: process.env.KEYCLOAK_PUBLIC_KEY,
  taxIdBypassRoles: ['admin', 'manager', 'auditor'], // Solo estos roles tienen bypass
})
```

## Extracción del TaxId

La librería busca el `taxId` en el siguiente orden de prioridad:

1. **Parámetro de ruta**: `@Param('taxId')`
   ```typescript
   @Get(':taxId/orders')
   getOrders(@Param('taxId') taxId: string)
   ```

2. **Query string**: `?taxId=...`
   ```bash
   GET /vendors/orders?taxId=77123456-7
   ```

3. **Body**: `{ taxId: "..." }`
   ```bash
   POST /vendors/create
   { "taxId": "77123456-7", "name": "Mi Empresa" }
   ```

4. **Header**: `x-tax-id`
   ```bash
   GET /vendors/orders
   headers: { "x-tax-id": "77123456-7" }
   ```

## Ejemplos Completos

### Ejemplo 1: Endpoint de lectura con validación completa

```typescript
@Get(':taxId/details')
@RequireResource('bff-suppliers')
@Roles('view-vendors')
@ValidateTaxId()
getVendorDetails(@Param('taxId') taxId: string) {
  // 1. Valida que tenga acceso al recurso 'bff-suppliers'
  // 2. Valida que tenga el rol 'view-vendors' en ese recurso
  // 3. Valida que el taxId esté en vendors-taxs (si es supplier)
  return { details: '...' };
}
```

### Ejemplo 2: Endpoint público con solo validación de taxId

```typescript
@Get(':taxId/public-info')
@ValidateTaxId()
getPublicVendorInfo(@Param('taxId') taxId: string) {
  // NO requiere roles específicos
  // SOLO valida que el taxId esté en vendors-taxs (si es supplier)
  return { info: '...' };
}
```

### Ejemplo 3: Endpoint de administración sin validación de taxId

```typescript
@Get('list')
@RequireResource('bff-suppliers')
@Roles('admin')
listAllVendors() {
  // Valida que tenga rol de admin
  // NO valida taxId (puede listar todos los vendors)
  return { vendors: [...] };
}
```

### Ejemplo 4: Actualización con taxId en el body

```typescript
@Put('update')
@RequireResource('bff-suppliers')
@Roles('update-vendors')
@ValidateTaxId()
updateVendor(@Body() body: UpdateVendorDto) {
  // El taxId viene en body.taxId
  // La librería lo extrae automáticamente
  return { updated: true };
}
```

## Normalización de TaxId

La librería normaliza los `taxId` para comparación:
- Convierte a mayúsculas
- Elimina espacios en blanco
- Trim

**Ejemplos de comparaciones válidas:**
- Token: `77123456-7` === Request: `77123456-7` ✅
- Token: `77123456-7` === Request: `77.123.456-7` ❌ (puntos no se eliminan)
- Token: `77123456-7` === Request: `  77123456-7  ` ✅ (trim)

## Mensajes de Error

### taxId no proporcionado
```json
{
  "statusCode": 401,
  "message": "taxId es requerido para este endpoint"
}
```

### taxId no está en vendors-taxs
```json
{
  "statusCode": 401,
  "message": "No tienes acceso al taxId: 77123456-7. Verifica que tu token contenga este taxId en vendors-taxs."
}
```

## Helpers Disponibles

Si necesitas validar taxId manualmente en tu código:

```typescript
import { 
  validateTaxIdAccess, 
  getUserTaxIds, 
  normalizeTaxId 
} from '@falabella/middleware-token-validate';

// Validar acceso
const hasAccess = validateTaxIdAccess(decodedToken, '77123456-7', ['admin']);

// Obtener todos los taxIds del usuario
const taxIds = getUserTaxIds(decodedToken);
// ['77123456-7', '12345678-9']

// Normalizar taxId
const normalized = normalizeTaxId('  77.123.456-7  ');
// '77.123.456-7'
```

## Testing

### Mock de token con taxId

```typescript
const mockToken = {
  sub: 'user-123',
  email: 'supplier@empresa.cl',
  realm_access: {
    roles: ['FBC_NATIONAL_COMMERCIAL_SUPPLIER_USER']
  },
  'vendors-taxs': [
    { taxId: '77123456-7', country: 'CL' },
  ],
};
```

### Mock de token con bypass

```typescript
const mockAdminToken = {
  sub: 'admin-123',
  email: 'admin@falabella.cl',
  realm_access: {
    roles: ['admin', 'FBC_NATIONAL_COMMERCIAL_SUPPLIER_USER']
  },
  'vendors-taxs': [
    { taxId: '77123456-7', country: 'CL' },
  ],
};
```

## Preguntas Frecuentes

### ¿Qué pasa si el token no tiene vendors-taxs?

Si el usuario tiene rol `FBC_NATIONAL_COMMERCIAL_SUPPLIER_USER` pero NO tiene el campo `vendors-taxs`, la validación **rechazará** cualquier request con `@ValidateTaxId()`.

### ¿Puedo usar ValidateTaxId sin RequireResource?

Sí, puedes usar `@ValidateTaxId()` sin `@RequireResource()` ni `@Roles()`. Solo validará el taxId.

### ¿Cómo agrego más roles de bypass?

```typescript
TokenValidateModule.forRoot({
  taxIdBypassRoles: ['admin', 'manager', 'auditor', 'super-user'],
})
```

O en el guard:

```typescript
new RolesGuard(reflector, {
  publicKey: process.env.KEYCLOAK_PUBLIC_KEY,
  taxIdBypassRoles: ['admin', 'manager'],
})
```

### ¿Funciona con Express?

Sí, la validación de taxId funciona con Express usando el adapter:

```typescript
import { adaptNestMiddlewareToExpress } from '@falabella/middleware-token-validate';

app.get('/vendors/:taxId', 
  adaptNestMiddlewareToExpress(
    new TokenValidateMiddleware({
      publicKey: process.env.KEYCLOAK_PUBLIC_KEY,
      skipVerification: true,
      validateTaxId: true,
    })
  ),
  (req, res) => {
    res.json({ taxId: req.params.taxId });
  }
);
```
