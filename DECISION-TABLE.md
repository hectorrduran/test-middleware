# Tabla de Decisión - Decoradores de Validación

Esta tabla te ayuda a decidir qué decoradores usar según el tipo de endpoint que estás creando.

## Matriz de Decisión

| Caso de Uso | Decoradores | Valida | Ejemplo |
|-------------|-------------|--------|---------|
| **Endpoint público** (solo token válido) | Ninguno | Solo autenticación | `GET /public/info` |
| **Endpoint exclusivo para admins/managers** | `@RequireRealmRoles('admin', 'manager')` | Roles en realm_access | `GET /admin/dashboard` |
| **Endpoint de recurso específico** | `@RequireResource('bff-suppliers')` | Acceso al recurso | `GET /suppliers/list` |
| **Endpoint de recurso + roles específicos** | `@RequireResource('bff-suppliers')`<br>`@Roles('view-orders')` | Recurso + roles del recurso | `GET /suppliers/orders` |
| **Endpoint con validación de taxId** | `@ValidateTaxId()` | TaxId en vendors-taxs | `GET /vendors/:taxId/profile` |
| **Endpoint con recurso + roles + taxId** | `@RequireResource('bff-suppliers')`<br>`@Roles('view-orders')`<br>`@ValidateTaxId()` | Recurso + roles + taxId | `GET /suppliers/:taxId/orders` |
| **Endpoint para auditores O validación completa** | `@RequireRealmRoles('auditor')`<br>`@RequireResource('bff-suppliers')`<br>`@Roles('view-data')`<br>`@ValidateTaxId()` | Realm roles (con bypass) O todo lo demás | `GET /suppliers/:taxId/audit` |

## Diagrama de Flujo de Validación

```
┌─────────────────────────────────────┐
│  Request llega al endpoint          │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  ¿Tiene @RequireRealmRoles?         │
├─────────────────────────────────────┤
│  SÍ → Valida roles en realm_access  │
│       ✅ Tiene rol → ACCESO          │
│       ❌ No tiene → 401              │
│       (Hace BYPASS de todo)         │
└─────────────┬───────────────────────┘
              │ NO
              ▼
┌─────────────────────────────────────┐
│  ¿Tiene @RequireResource?           │
├─────────────────────────────────────┤
│  SÍ → Valida recurso en             │
│       resource_access               │
│       ✅ Tiene recurso → Continúa   │
│       ❌ No tiene → 401              │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  ¿Tiene @Roles con @RequireResource?│
├─────────────────────────────────────┤
│  SÍ → Valida roles dentro del       │
│       recurso                       │
│       ✅ Tiene rol → Continúa       │
│       ❌ No tiene → 401              │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  ¿Tiene @ValidateTaxId?             │
├─────────────────────────────────────┤
│  SÍ → Extrae taxId de la request    │
│       ¿Tiene bypass roles?          │
│       SÍ → ACCESO                   │
│       NO → Valida vendors-taxs      │
│            ✅ Tiene taxId → ACCESO  │
│            ❌ No tiene → 401         │
└─────────────┬───────────────────────┘
              │ NO
              ▼
┌─────────────────────────────────────┐
│  ✅ ACCESO PERMITIDO                │
└─────────────────────────────────────┘
```

## Guía de Selección Rápida

### ¿Qué decorador usar?

#### 1. ¿Es un endpoint público?
- **SÍ** → No uses decoradores
- **NO** → Continúa

#### 2. ¿Es exclusivo para roles globales (admin/manager/auditor)?
- **SÍ** → Usa `@RequireRealmRoles('admin', 'manager')`
- **NO** → Continúa

#### 3. ¿Necesita acceso a un recurso específico?
- **SÍ** → Usa `@RequireResource('nombre-recurso')`
  - ¿Necesita roles específicos dentro del recurso?
    - **SÍ** → Agrega `@Roles('rol1', 'rol2')`
- **NO** → Continúa

#### 4. ¿Necesita validar taxId del proveedor?
- **SÍ** → Agrega `@ValidateTaxId()`
- **NO** → Listo

## Ejemplos por Rol de Usuario

### Usuario: Proveedor (FBC_NATIONAL_COMMERCIAL_SUPPLIER_USER)

**Token:**
```json
{
  "realm_access": {
    "roles": ["FBC_NATIONAL_COMMERCIAL_SUPPLIER_USER"]
  },
  "resource_access": {
    "bff-suppliers": {
      "roles": ["view-orders", "view-profile"]
    }
  },
  "vendors-taxs": [
    { "taxId": "77123456-7", "country": "CL" }
  ]
}
```

**Acceso:**
| Endpoint | ¿Puede acceder? | Razón |
|----------|----------------|-------|
| `GET /public/info` | ✅ SÍ | Endpoint público |
| `GET /admin/dashboard` con `@RequireRealmRoles('admin')` | ❌ NO | No tiene rol admin |
| `GET /suppliers/reports` con `@RequireResource('bff-suppliers')` | ✅ SÍ | Tiene acceso al recurso |
| `GET /suppliers/orders` con `@RequireResource('bff-suppliers')` + `@Roles('view-orders')` | ✅ SÍ | Tiene recurso y rol |
| `GET /suppliers/77123456-7/details` con `@ValidateTaxId()` | ✅ SÍ | Tiene el taxId en vendors-taxs |
| `GET /suppliers/99999999-9/details` con `@ValidateTaxId()` | ❌ NO | No tiene ese taxId |

### Usuario: Administrador

**Token:**
```json
{
  "realm_access": {
    "roles": ["admin", "FBC_NATIONAL_COMMERCIAL_SUPPLIER_USER"]
  },
  "resource_access": {
    "bff-suppliers": {
      "roles": ["view-orders", "manage-suppliers"]
    }
  },
  "vendors-taxs": []
}
```

**Acceso:**
| Endpoint | ¿Puede acceder? | Razón |
|----------|----------------|-------|
| `GET /public/info` | ✅ SÍ | Endpoint público |
| `GET /admin/dashboard` con `@RequireRealmRoles('admin')` | ✅ SÍ | Tiene rol admin en realm |
| `GET /suppliers/77123456-7/details` con `@ValidateTaxId()` | ✅ SÍ | Bypass por rol admin (aunque vendors-taxs esté vacío) |
| `GET /suppliers/99999999-9/orders` con `@ValidateTaxId()` | ✅ SÍ | Bypass por rol admin |
| `GET /suppliers/:taxId` con `@RequireRealmRoles('admin')` + `@ValidateTaxId()` | ✅ SÍ | @RequireRealmRoles hace bypass de @ValidateTaxId |

### Usuario: Auditor

**Token:**
```json
{
  "realm_access": {
    "roles": ["auditor"]
  },
  "resource_access": {},
  "vendors-taxs": []
}
```

**Acceso:**
| Endpoint | ¿Puede acceder? | Razón |
|----------|----------------|-------|
| `GET /public/info` | ✅ SÍ | Endpoint público |
| `GET /audit/logs` con `@RequireRealmRoles('auditor')` | ✅ SÍ | Tiene rol auditor |
| `GET /suppliers/list` con `@RequireResource('bff-suppliers')` | ❌ NO | No tiene acceso al recurso |
| `GET /suppliers/:taxId` con `@ValidateTaxId()` | ❌ NO | No tiene vendors-taxs ni bypass role |

## Configuración de Bypass para TaxId

Por defecto, la validación de taxId se omite si el usuario tiene **cualquier rol diferente** a `FBC_NATIONAL_COMMERCIAL_SUPPLIER_USER` en `realm_access`.

Puedes personalizar esto:

```typescript
TokenValidateModule.forRoot({
  publicKey: process.env.KEYCLOAK_PUBLIC_KEY,
  taxIdBypassRoles: ['admin', 'manager', 'auditor'], // Solo estos roles omiten validación
})
```

## Preguntas Frecuentes

### ¿Puedo combinar @RequireRealmRoles con @RequireResource?

Sí, pero `@RequireRealmRoles` tiene **prioridad máxima**. Si el usuario tiene el rol de realm, no se validan los recursos ni el taxId.

```typescript
@Get(':taxId/data')
@RequireRealmRoles('admin') // Si tiene admin, acceso directo
@RequireResource('bff-suppliers') // Solo se valida si NO tiene admin
@ValidateTaxId() // Solo se valida si NO tiene admin
getData(@Param('taxId') taxId: string) { }
```

### ¿Cuál es la diferencia entre @Roles y @RequireRealmRoles?

- **`@Roles`**: Valida roles dentro de un recurso en `resource_access` (o en `realm_access` si no hay `@RequireResource`)
- **`@RequireRealmRoles`**: Siempre valida roles en `realm_access` y hace bypass de todo lo demás

### ¿Qué pasa si no uso ningún decorador?

El endpoint solo requiere un token JWT válido. No se validan roles, recursos ni taxId.

### ¿Puedo usar @ValidateTaxId sin @RequireResource?

Sí, `@ValidateTaxId()` puede usarse solo. Validará el taxId sin requerir recursos o roles específicos.
