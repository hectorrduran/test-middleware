# Guía de Aliases de Roles

Esta guía explica cómo usar aliases de roles en lugar de especificar roles de Keycloak directamente.

## ¿Qué son los Aliases de Roles?

Los aliases son **nombres cortos y descriptivos** que se expanden automáticamente a uno o más roles de Keycloak.

### Ventajas

✅ **Más legible**: `@RequireRealmRoles('Admin')` vs `@RequireRealmRoles('admin', 'super-admin', 'system-admin')`  
✅ **Centralizado**: Cambia los roles en un solo lugar (`role-aliases.ts`)  
✅ **Mantenible**: No necesitas actualizar cada controlador si cambias los roles  
✅ **Semántico**: Usa nombres que reflejan la intención del negocio

## Aliases Predefinidos

| Alias | Roles de Keycloak | Descripción |
|-------|-------------------|-------------|
| `Admin` | `admin`, `super-admin`, `system-admin` | Administradores con privilegios completos |
| `Manager` | `manager`, `team-lead`, `supervisor` | Gestores y supervisores |
| `Auditor` | `auditor`, `compliance-officer` | Auditores y oficiales de cumplimiento |
| `Supplier` | `FBC_NATIONAL_COMMERCIAL_SUPPLIER_USER` | Proveedores comerciales |
| `ALL` | _(ninguno)_ | Cualquier usuario autenticado |

## Uso Básico

### Con @RequireRealmRoles

```typescript
import { Controller, Get } from '@nestjs/common';
import { RequireRealmRoles } from '@falabella/middleware-token-validate';

@Controller('admin')
export class AdminController {
  // ✅ Usando alias
  @Get('dashboard')
  @RequireRealmRoles('Admin')
  getDashboard() {
    return { message: 'Dashboard' };
  }

  // ❌ Sin alias (más verboso)
  @Get('dashboard-old')
  @RequireRealmRoles('admin', 'super-admin', 'system-admin')
  getDashboardOld() {
    return { message: 'Dashboard' };
  }
}
```

### Con @Roles (dentro de recursos)

```typescript
import { Controller, Get } from '@nestjs/common';
import { RequireResource, Roles } from '@falabella/middleware-token-validate';

@Controller('suppliers')
export class SupplierController {
  // Alias funciona también con @Roles
  @Get('admin-panel')
  @RequireResource('bff-suppliers')
  @Roles('Admin', 'Manager')
  getAdminPanel() {
    return { message: 'Panel de administración' };
  }
}
```

## Combinar Aliases y Roles Específicos

Puedes mezclar aliases con roles específicos de Keycloak:

```typescript
@Get('special-access')
@RequireRealmRoles('Admin', 'custom-role', 'another-specific-role')
getSpecialAccess() {
  // 'Admin' se expande a ['admin', 'super-admin', 'system-admin']
  // 'custom-role' y 'another-specific-role' se usan tal cual
  return { message: 'Acceso especial' };
}
```

## Alias 'ALL'

El alias especial `'ALL'` permite acceso a cualquier usuario autenticado:

```typescript
@Get('public/info')
@RequireRealmRoles('ALL')
getPublicInfo() {
  // Solo valida que el token sea válido
  // NO valida roles específicos
  return { message: 'Información pública' };
}
```

**Equivalente a:**

```typescript
@Get('public/info')
getPublicInfo() {
  // Sin decoradores también permite cualquier usuario autenticado
  return { message: 'Información pública' };
}
```

## Personalizar Aliases

Puedes agregar tus propios aliases editando `src/config/role-aliases.ts`:

```typescript
export const ROLE_ALIASES: Record<string, string[]> = {
  // Aliases predefinidos
  Admin: ['admin', 'super-admin', 'system-admin'],
  Manager: ['manager', 'team-lead', 'supervisor'],
  Auditor: ['auditor', 'compliance-officer'],
  Supplier: ['FBC_NATIONAL_COMMERCIAL_SUPPLIER_USER'],
  ALL: [],

  // ⭐ Agrega tus propios aliases aquí
  Developer: ['developer', 'engineer', 'tech-lead', 'senior-dev'],
  Support: ['support-agent', 'customer-service', 'help-desk'],
  Finance: ['finance-manager', 'accountant', 'controller'],
  HR: ['hr-manager', 'recruiter', 'people-ops'],
  
  // Aliases específicos de tu organización
  FalabellaAdmin: ['falabella-admin', 'corp-admin', 'regional-admin'],
  VendorManager: ['vendor-manager', 'supplier-coordinator'],
};
```

### Ejemplo de Alias Personalizado

```typescript
// Después de agregar 'Developer' al archivo role-aliases.ts
@Get('dev-tools')
@RequireRealmRoles('Developer')
getDevTools() {
  // Accesible para: developer, engineer, tech-lead, senior-dev
  return { message: 'Herramientas de desarrollo' };
}
```

## Casos de Uso Comunes

### 1. Dashboard de Administración

```typescript
@Controller('admin')
export class AdminDashboardController {
  @Get('stats')
  @RequireRealmRoles('Admin')
  getStats() {
    return { message: 'Estadísticas del sistema' };
  }

  @Get('users')
  @RequireRealmRoles('Admin', 'HR')
  getUsers() {
    return { message: 'Lista de usuarios' };
  }
}
```

### 2. Reportes para Gerentes

```typescript
@Controller('reports')
export class ReportsController {
  @Get('sales')
  @RequireRealmRoles('Manager', 'Admin')
  getSalesReports() {
    return { message: 'Reportes de ventas' };
  }

  @Get('financial')
  @RequireRealmRoles('Finance', 'Admin')
  getFinancialReports() {
    return { message: 'Reportes financieros' };
  }
}
```

### 3. Auditoría y Compliance

```typescript
@Controller('audit')
export class AuditController {
  @Get('logs')
  @RequireRealmRoles('Auditor', 'Admin')
  getAuditLogs() {
    return { message: 'Logs de auditoría' };
  }

  @Get('compliance-check')
  @RequireRealmRoles('Auditor')
  getComplianceCheck() {
    return { message: 'Verificación de cumplimiento' };
  }
}
```

### 4. Endpoint para Todos

```typescript
@Controller('public')
export class PublicController {
  @Get('announcements')
  @RequireRealmRoles('ALL')
  getAnnouncements() {
    // Cualquier usuario autenticado puede ver los anuncios
    return { message: 'Anuncios generales' };
  }
}
```

## Prioridad de Validación

Cuando usas aliases con otros decoradores:

```typescript
@Get('suppliers/:taxId/data')
@RequireRealmRoles('Admin')  // 1️⃣ Se valida PRIMERO
@RequireResource('bff-suppliers')  // 2️⃣ Solo si NO tiene Admin
@Roles('view-data')  // 3️⃣ Solo si NO tiene Admin
@ValidateTaxId()  // 4️⃣ Solo si NO tiene Admin
getData(@Param('taxId') taxId: string) {
  // Si tiene Admin → acceso directo (bypass de todo)
  // Si NO tiene Admin → valida recurso, rol y taxId
  return { message: 'Datos del supplier' };
}
```

## Verificar Resolución de Aliases

Puedes verificar cómo se resuelven los aliases:

```typescript
import { resolveRoleAlias, resolveRoleAliases } from '@falabella/middleware-token-validate';

// Resolver un alias
console.log(resolveRoleAlias('Admin'));
// Output: ['admin', 'super-admin', 'system-admin']

// Resolver múltiples aliases
console.log(resolveRoleAliases(['Admin', 'Manager']));
// Output: ['admin', 'super-admin', 'system-admin', 'manager', 'team-lead', 'supervisor']

// Rol específico (no es alias)
console.log(resolveRoleAlias('custom-role'));
// Output: ['custom-role']
```

## Mejores Prácticas

### ✅ DO

```typescript
// Usa aliases para roles comunes
@RequireRealmRoles('Admin', 'Manager')

// Centraliza la definición de roles
// En role-aliases.ts:
VendorManager: ['vendor-manager', 'supplier-coordinator']

// Usa nombres semánticos
Finance: ['finance-manager', 'accountant']
```

### ❌ DON'T

```typescript
// No dupliques listas largas de roles
@RequireRealmRoles('admin', 'super-admin', 'system-admin', 'manager', 'team-lead')

// No uses alias para un solo rol
SingleRole: ['only-one-role']  // Mejor usar el rol directamente

// No uses nombres confusos
X: ['admin', 'manager']  // Usa nombres descriptivos
```

## Migración desde Roles Específicos

Si ya tienes código con roles específicos:

### Antes:
```typescript
@Get('dashboard')
@RequireRealmRoles('admin', 'super-admin', 'system-admin')
getDashboard() { }
```

### Después:
```typescript
@Get('dashboard')
@RequireRealmRoles('Admin')
getDashboard() { }
```

**Pasos:**
1. Identifica grupos de roles que siempre se usan juntos
2. Crea aliases descriptivos en `role-aliases.ts`
3. Reemplaza las listas de roles con aliases
4. Compila y prueba

## Preguntas Frecuentes

### ¿Puedo usar aliases en @Roles?

Sí, los aliases funcionan en `@RequireRealmRoles()` y `@Roles()`.

### ¿Qué pasa si uso un alias que no existe?

Se trata como un rol específico de Keycloak. Por ejemplo, `@RequireRealmRoles('NonExistentAlias')` buscará el rol `'NonExistentAlias'` en el token.

### ¿Los aliases son case-sensitive?

Sí. `'Admin'` ≠ `'admin'`. Por convención, usa PascalCase para aliases (`Admin`, `Manager`) y lowercase para roles de Keycloak (`admin`, `manager`).

### ¿Puedo modificar los aliases predefinidos?

Sí, puedes editar `src/config/role-aliases.ts` libremente.

### ¿Cómo agrego más roles a un alias existente?

Edita el array correspondiente en `role-aliases.ts`:

```typescript
Admin: ['admin', 'super-admin', 'system-admin', 'global-admin'], // ✅ Agregado global-admin
```
