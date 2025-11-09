# Cómo Funciona la Validación de Tax ID

## 🎯 Concepto Principal

El middleware **compara el `tax_id` del token JWT con el `tax_id` de la petición** para asegurar que un usuario solo pueda acceder a datos de su propia empresa.

## 🔍 Dos Fuentes de Tax ID

### 1️⃣ Tax ID del Token (decoded.tax_id o decoded['vendors-taxs'])

El token JWT puede contener el tax_id en **dos formatos diferentes**:

#### Formato Simple (tax_id)
```json
{
  "sub": "user-123",
  "email": "usuario@empresa.cl",
  "tax_id": "76.123.456-7",  // ← Empresa del usuario (formato simple)
  "realm_access": {
    "roles": ["user"]
  }
}
```

#### Formato Falabella (vendors-taxs)
```json
{
  "sub": "5f27b4a8-29ba-41e3-a0b8-8bdf0126d8b3",
  "email": "corpvendor7@gmail.com",
  "name": "Isabella Salazar",
  "vendors-taxs": [  // ← Array de vendors (formato Falabella)
    {
      "name": "",
      "taxId": "10214564-K",  // ← Tax ID aquí
      "operation": [
        {
          "businessUnit": "SOD",
          "country": ["CL"]
        }
      ],
      "country": "CL"
    }
  ],
  "realm_access": {
    "roles": ["FBC_NATIONAL_COMMERCIAL_SUPPLIER_USER"]
  }
}
```

**El middleware soporta ambos formatos automáticamente.**

Este campo es agregado por **Keycloak** (o tu IDP) al momento de autenticar al usuario. Típicamente viene desde:
- Atributo personalizado del usuario en Keycloak
- Mapper de token en Keycloak
- Claims del SAML/OIDC

### 2️⃣ Tax ID del Request

El tax_id solicitado viene en la petición HTTP. El middleware lo busca en múltiples lugares:

```typescript
// 1. URL params (más común)
GET /api/companies/:tax_id/settings
GET /api/companies/76.123.456-7/settings

// 2. Query params
GET /api/companies?tax_id=76.123.456-7

// 3. Body (POST/PUT)
POST /api/companies
{
  "tax_id": "76.123.456-7",
  "name": "Mi Empresa"
}

// 4. Headers
GET /api/companies/data
X-Tax-Id: 76.123.456-7
```

## ⚙️ Función de Extracción

```typescript
export function extractTaxId(request: {
  params?: any;
  query?: any;
  body?: any;
  headers?: any;
}): string | null {
  // Prioridad 1: URL params
  if (request.params?.taxId) return request.params.taxId;
  if (request.params?.tax_id) return request.params.tax_id;

  // Prioridad 2: Query params
  if (request.query?.taxId) return request.query.taxId;
  if (request.query?.tax_id) return request.query.tax_id;

  // Prioridad 3: Body
  if (request.body?.taxId) return request.body.taxId;
  if (request.body?.tax_id) return request.body.tax_id;

  // Prioridad 4: Headers
  if (request.headers?.['x-tax-id']) return request.headers['x-tax-id'];

  return null;
}
```

## 🔒 Proceso de Validación

```typescript
export function validateTaxId(
  decoded: DecodedToken,
  taxId: string,
  options?: TaxIdValidationOptions
): ValidationResult {
  // 1. Extraer todos los tax IDs del token (soporta múltiples formatos)
  const userTaxIds = extractTaxIdsFromToken(decoded);
  
  // 2. Normalizar el tax_id solicitado
  const normalizedRequested = normalizeTaxId(taxId);

  // 3. Verificar si el usuario tiene acceso a este tax_id
  const hasAccess = userTaxIds.includes(normalizedRequested);

  if (!hasAccess) {
    throw new ForbiddenException(
      `No tienes acceso a la empresa con tax_id: ${taxId}. ` +
      `Tax IDs disponibles: ${userTaxIds.join(', ')}`
    );
  }

  return { valid: true };
}

/**
 * Extrae todos los tax IDs del token (soporta múltiples formatos)
 */
function extractTaxIdsFromToken(decoded: DecodedToken): string[] {
  const taxIds: string[] = [];

  // Formato simple: decoded.tax_id
  if (decoded.tax_id) {
    taxIds.push(normalizeTaxId(decoded.tax_id));
  }

  // Formato Falabella: decoded['vendors-taxs'] (array)
  if (decoded['vendors-taxs'] && Array.isArray(decoded['vendors-taxs'])) {
    for (const vendor of decoded['vendors-taxs']) {
      if (vendor.taxId) {
        taxIds.push(normalizeTaxId(vendor.taxId));
      }
    }
  }

  return taxIds;
}
```

## 📊 Ejemplos Paso a Paso

### ✅ Ejemplo 1: Acceso Permitido (Formato Simple)

**Usuario autenticado:**
```json
{
  "sub": "juan-123",
  "email": "juan@empresa.cl",
  "tax_id": "76.123.456-7",
  "realm_access": {
    "roles": ["company-admin"]
  }
}
```

**Request A:**
```http
GET /api/companies/10214564-K/invoices
```

**Proceso A:**
```typescript
1. requestedTaxId = "10214564-K"
2. extractTaxIdsFromToken() → ["10214564K", "987654321"]
3. normalize("10214564-K") → "10214564K"
4. ["10214564K", "987654321"].includes("10214564K") ✅
5. → 200 OK (Tiene acceso a primera empresa)
```

**Request B:**
```http
GET /api/companies/98765432-1/invoices
```

**Proceso B:**
```typescript
1. requestedTaxId = "98765432-1"
2. extractTaxIdsFromToken() → ["10214564K", "987654321"]
3. normalize("98765432-1") → "987654321"
4. ["10214564K", "987654321"].includes("987654321") ✅
5. → 200 OK (Tiene acceso a segunda empresa)
```

---

### ❌ Ejemplo 4: Acceso Denegado

**Usuario autenticado:**
```json
{
  "sub": "5f27b4a8-29ba-41e3-a0b8-8bdf0126d8b3",
  "email": "corpvendor7@gmail.com",
  "vendors-taxs": [
    {
      "taxId": "10214564-K",
      "operation": [{"businessUnit": "SOD", "country": ["CL"]}],
      "country": "CL"
    }
  ]
}
```

**Request:**
```http
GET /api/companies/10214564-K/settings
```

**Proceso:**
```typescript
1. requestedTaxId = "10214564-K"
2. extractTaxIdsFromToken() → ["10214564K"]  // Extrae de vendors-taxs[0].taxId
3. normalize("10214564-K") → "10214564K"
4. ["10214564K"].includes("10214564K") ✅
5. → 200 OK
```

---

### ✅ Ejemplo 3: Usuario con Múltiples Empresas (vendors-taxs)

**Usuario autenticado:**
```json
{
  "sub": "maria-456",
  "email": "maria@proveedor.cl",
  "vendors-taxs": [
    {
      "taxId": "10214564-K",
      "country": "CL"
    },
    {
      "taxId": "98765432-1",
      "country": "CL"
    }
  ]
}
```

**Petición:**
```http
---

### ❌ Ejemplo 4: Acceso Denegado

**Usuario autenticado:**
```json
{
  "sub": "juan-789",
  "email": "juan@empresa.cl",
  "vendors-taxs": [
    {
      "taxId": "10214564-K",
      "country": "CL"
    }
  ]
}
```
```

---

### ❌ Ejemplo 4: Acceso Denegado

**Usuario autenticado:**
```json
{
  "sub": "juan-789",
  "email": "juan@empresa.cl",
  "vendors-taxs": [
    {
      "taxId": "10214564-K",
      "country": "CL"
    }
  ]
}
```

**Request:**
```http
GET /api/companies/99888777-6/settings  # ← Tax ID diferente
```

**Proceso:**
```typescript
1. requestedTaxId = "99888777-6"
2. extractTaxIdsFromToken() → ["10214564K"]
3. normalize("99888777-6") → "998887776"
4. ["10214564K"].includes("998887776") ❌
5. → 403 Forbidden
```

---

### ✅ Ejemplo 5: Admin Bypass

**Usuario admin:**
```json
{
  "tax_id": "76.123.456-7",
  "realm_access": {
    "roles": ["admin"]  // ← Rol especial
  }
}
```

**Petición:**
```http
GET /api/companies/77.999.888-K/invoices  // Acceso a otra empresa
Authorization: Bearer eyJhbGc...
```

**Validación:**
```
1. Verificar bypass roles:
   Usuario tiene rol "admin" ✅

2. Resultado: ACCESO PERMITIDO (sin comparar tax_id)
   Los admins pueden acceder a cualquier empresa
```

## 🚀 Uso en Express

```typescript
import { createTaxIdMiddleware } from '@falabella/middleware-token-validate';

// Endpoint que valida tax_id automáticamente
app.get('/api/companies/:tax_id/invoices',
  tokenMiddleware,  // Valida y decodifica el token
  createTaxIdMiddleware({
    bypassRoles: ['admin', 'superadmin']  // Roles que pueden saltarse la validación
  }),
  (req, res) => {
    // Si llegamos aquí, el usuario tiene acceso al tax_id
    res.json({ invoices: [] });
  }
);
```

## 🏗️ Uso en NestJS

```typescript
import { ValidateTaxId } from '@falabella/middleware-token-validate';

@Controller('companies')
export class CompaniesController {
  
  @Get(':tax_id/invoices')
  @ValidateTaxId()  // ← Valida automáticamente
  async getInvoices(@Param('tax_id') taxId: string) {
    // Si llegamos aquí, el usuario tiene acceso al tax_id
    return { invoices: [] };
  }
}
```

## ⚙️ Configuración de Bypass Roles

Roles que pueden acceder a **cualquier** tax_id sin restricciones:

```typescript
// Express
TokenValidateModule.forRoot({
  taxIdBypassRoles: ['admin', 'superadmin', 'auditor']
});

// NestJS
createTaxIdMiddleware({
  bypassRoles: ['admin', 'superadmin', 'auditor']
});
```

## 🔧 Normalización de Tax ID

Para evitar problemas con formatos diferentes, el middleware normaliza ambos tax_id:

```typescript
function normalizeTaxId(taxId: string): string {
  return taxId
    .trim()           // Eliminar espacios
    .toUpperCase()    // Convertir a mayúsculas
    .replace(/\s+/g, ''); // Eliminar espacios internos
}
```

**Ejemplos:**
```
"76.123.456-7"  → "76.123.456-7"
"76 123 456-7"  → "76.123.456-7"
"76123456-7"    → "76123456-7"
" 76.123.456-7 " → "76.123.456-7"
```

## 📝 Estructura del Token Keycloak

Para que funcione, tu token de Keycloak debe incluir el claim `tax_id`:

### Configuración en Keycloak

1. **Crear User Attribute**:
   - Ve a Users → Atributos
   - Agrega: `tax_id` = `76.123.456-7`

2. **Crear Token Mapper**:
   - Ve a Client → Mappers → Create
   - Mapper Type: `User Attribute`
   - User Attribute: `tax_id`
   - Token Claim Name: `tax_id`
   - Claim JSON Type: `String`
   - Add to ID token: ON
   - Add to access token: ON

3. **Token resultante**:
```json
{
  "sub": "user-123",
  "email": "usuario@empresa.cl",
  "tax_id": "76.123.456-7",  // ← Aparece aquí
  "realm_access": {
    "roles": ["user"]
  }
}
```

## ❓ FAQ

### ¿Qué pasa si el token no tiene tax_id?

```
❌ Error: "El token no contiene tax_id"
Status: 403 Forbidden
```

### ¿Qué pasa si el request no tiene tax_id?

```
❌ Error: "tax_id no proporcionado en la solicitud"
Status: 400 Bad Request
```

### ¿Puedo usar vendors-taxs (array)?

Sí, existe soporte legacy para `vendors-taxs[]`:

```typescript
validateVendorsTaxs(decoded, requestedTaxId);
```

### ¿Funciona en modo decode-only?

✅ Sí, la validación de tax_id funciona igual en ambos modos:
- Modo validación completa: valida firma + tax_id
- Modo decode-only: solo decodifica + valida tax_id

## 🔗 Ver También

- [TAX-ID-VALIDATION.md](./TAX-ID-VALIDATION.md) - Guía completa
- [DECODE-ONLY-MODE.md](./DECODE-ONLY-MODE.md) - Modo sin validación de firma
- [EXPRESS-GUIDE.md](./EXPRESS-GUIDE.md) - Uso con Express
