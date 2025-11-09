# 🏢 Soporte de vendors-taxs[] Array

## 📋 Contexto

El middleware ahora soporta **dos formatos de token** para validación de tax_id:

### Formato Simple (legacy)
```json
{
  "tax_id": "76.123.456-7"
}
```

### Formato Falabella (vendors-taxs)
```json
{
  "vendors-taxs": [
    {
      "name": "",
      "taxId": "10214564-K",
      "operation": [
        {
          "businessUnit": "SOD",
          "country": ["CL"]
        }
      ],
      "country": "CL"
    }
  ]
}
```

---

## 🔧 Estructura del VendorTax

```typescript
interface VendorTax {
  name?: string;           // Nombre del vendor (opcional)
  taxId: string;           // Tax ID del vendor (requerido)
  operation?: Array<{      // Operaciones permitidas (opcional)
    businessUnit: string;
    country: string[];
  }>;
  country?: string;        // País principal (opcional)
}
```

---

## 🚀 Extracción Automática

El middleware extrae automáticamente **todos los tax IDs** del token:

```typescript
function extractTaxIdsFromToken(decoded: DecodedToken): string[] {
  const taxIds: string[] = [];

  // 1. Formato simple: decoded.tax_id
  if (decoded.tax_id) {
    taxIds.push(normalizeTaxId(decoded.tax_id));
  }

  // 2. Formato Falabella: decoded['vendors-taxs']
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

---

## ✅ Ejemplos

### Usuario con Una Empresa

**Token:**
```json
{
  "vendors-taxs": [
    {
      "taxId": "10214564-K",
      "country": "CL"
    }
  ]
}
```

**Requests permitidos:**
```http
✅ GET /api/companies/10214564-K/settings
✅ GET /api/companies/10214564K/settings    (sin guión)
✅ GET /api/companies/10214564-k/settings   (minúsculas)
```

**Requests denegados:**
```http
❌ GET /api/companies/99999999-9/settings
   → 403: "No tienes acceso a la empresa 99999999-9. Tax IDs disponibles: 10214564K"
```

---

### Usuario con Múltiples Empresas

**Token:**
```json
{
  "vendors-taxs": [
    {
      "taxId": "10214564-K",
      "country": "CL"
    },
    {
      "taxId": "98765432-1",
      "country": "CL"
    },
    {
      "taxId": "11222333-4",
      "country": "CL"
    }
  ]
}
```

**Requests permitidos:**
```http
✅ GET /api/companies/10214564-K/settings
✅ GET /api/companies/98765432-1/invoices
✅ GET /api/companies/11222333-4/products
```

**El usuario puede acceder a CUALQUIERA de sus 3 empresas.**

---

## 🔄 Compatibilidad con Formato Legacy

El middleware sigue soportando el formato antiguo:

**Token legacy:**
```json
{
  "tax_id": "76.123.456-7"
}
```

**Request:**
```http
GET /api/companies/76123456-7/settings
```

**Resultado:**
```typescript
extractTaxIdsFromToken() → ["761234567"]
✅ Acceso permitido
```

---

## 🛡️ Normalización de Tax IDs

Todos los tax IDs se normalizan para comparación:

| Input           | Normalizado |
|-----------------|-------------|
| `10214564-K`    | `10214564K` |
| `10214564-k`    | `10214564K` |
| `10.214.564-K`  | `10214564K` |
| `10 214 564-K`  | `10214564K` |
| `76.123.456-7`  | `761234567` |

**Regla de normalización:**
- Elimina puntos (`.`)
- Elimina espacios
- Convierte a mayúsculas

---

## 📊 Flujo de Validación

```
Request: GET /api/companies/10214564-K/settings
         Authorization: Bearer eyJhbGc...

         ↓

1. Middleware extrae tax_id del request
   → requestedTaxId = "10214564-K"

         ↓

2. Middleware decodifica token
   → decoded['vendors-taxs'] = [{ taxId: "10214564-K" }, ...]

         ↓

3. extractTaxIdsFromToken(decoded)
   → ["10214564K", ...]

         ↓

4. normalize(requestedTaxId)
   → "10214564K"

         ↓

5. Verificar acceso
   → ["10214564K", ...].includes("10214564K") ✅

         ↓

6. Resultado: 200 OK
```

---

## 🚨 Mensajes de Error Mejorados

Cuando el usuario intenta acceder a un tax_id no autorizado:

```typescript
throw new ForbiddenException(
  `No tienes acceso a la empresa con tax_id: ${taxId}. ` +
  `Tax IDs disponibles: ${userTaxIds.join(', ')}`
);
```

**Ejemplo de error:**
```
403 Forbidden
{
  "statusCode": 403,
  "message": "No tienes acceso a la empresa con tax_id: 99999999-9. Tax IDs disponibles: 10214564K, 987654321"
}
```

Esto ayuda al usuario a saber a qué empresas **SÍ** tiene acceso.

---

## 🔧 Uso en Express

```typescript
import { createTaxIdMiddleware } from '@falabella/middleware-token-validate';

app.get('/api/companies/:tax_id/settings',
  tokenMiddleware,
  createTaxIdMiddleware({
    bypassRoles: ['admin']
  }),
  (req, res) => {
    // Usuario tiene acceso al tax_id (validado)
    res.json({ settings: {...} });
  }
);
```

---

## 🏗️ Uso en NestJS

```typescript
import { ValidateTaxId } from '@falabella/middleware-token-validate';

@Controller('companies')
export class CompaniesController {
  
  @Get(':tax_id/settings')
  @ValidateTaxId()
  async getSettings(@Param('tax_id') taxId: string) {
    // Usuario tiene acceso al tax_id (validado)
    return { settings: {...} };
  }
}
```

---

## ✨ Ventajas del Formato vendors-taxs

1. **Multi-tenant nativo:** Un usuario puede pertenecer a múltiples empresas
2. **Metadata adicional:** Cada vendor puede tener país, operaciones, etc.
3. **Granularidad:** Futuro soporte para validar businessUnit y country
4. **Escalabilidad:** Fácil agregar/quitar empresas sin regenerar token

---

## 🔮 Próximas Mejoras (Roadmap)

- [ ] Validar `businessUnit` en requests
- [ ] Validar `country` en requests
- [ ] Filtrar vendors por rol específico
- [ ] Soporte de permisos por vendor individual

---

## 📖 Referencias

- [TAX-ID-HOW-IT-WORKS.md](./TAX-ID-HOW-IT-WORKS.md) - Explicación detallada del flujo
- [USAGE-GUIDE.md](./USAGE-GUIDE.md) - Guía completa de uso
- [DECODE-ONLY-MODE.md](./DECODE-ONLY-MODE.md) - Modo decode-only para API Gateway
