# Middleware Token Validate v2.0

**Librería framework-agnostic** para validar tokens JWT de Keycloak y verificar acceso a recursos.

## ✨ Características

- 🎯 **Framework-agnostic**: Core puro sin dependencias de frameworks
- 🚀 **Compatible con NestJS y Express**
- 📦 **Dependencias opcionales**: Solo instala lo que necesitas
- 🔒 **Validación completa**: Tokens, roles, recursos y Tax ID
- ⚡ **Modo Decode-Only**: Para cuando el token ya fue validado por una capa anterior (API Gateway, Cloud Endpoints)
- 🎨 **TypeScript**: Tipado completo
- ♻️ **Retrocompatible**: Migración sin breaking changes

## 📦 Instalación

### Core (siempre requerido)
```bash
npm install @falabella/middleware-token-validate
```

### Para NestJS
```bash
npm install @nestjs/common @nestjs/core reflect-metadata rxjs
```

### Para Express
```bash
npm install express
npm install --save-dev @types/express
```

## 🏗️ Arquitectura

```
src/
├── core/                          # Core puro (sin frameworks)
│   ├── types.ts                   # Tipos compartidos
│   ├── token-validator.ts         # Validación de tokens
│   ├── role-validator.ts          # Validación de roles
│   ├── tax-id-validator.ts        # Validación de Tax ID
│   └── role-aliases.ts            # Aliases de roles
│
└── adapters/                      # Adaptadores para frameworks
    ├── nestjs.ts                  # Adaptador para NestJS
    │   ├── nestjs-middleware.ts
    │   ├── nestjs-guard.ts
    │   ├── nestjs-decorators.ts
    │   └── nestjs-module.ts
    │
    └── express.ts                 # Adaptador para Express
```

## 🚀 Uso Rápido

### Con Express (Validación Completa)

```typescript
import express from 'express';
import { createTokenMiddleware, createRolesMiddleware } from '@falabella/middleware-token-validate';

const app = express();

const tokenMiddleware = createTokenMiddleware({
  jwtSecret: 'your-secret-key'
});

// Ruta protegida
app.get('/api/profile', tokenMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// Ruta con roles
app.get('/api/admin', 
  tokenMiddleware,
  createRolesMiddleware(['admin']),
  (req, res) => {
    res.json({ message: 'Admin area' });
  }
);
```

### Con Express (Modo Decode-Only)

**Para cuando el token ya fue validado por API Gateway/Cloud Endpoints:**

```typescript
import express from 'express';
import { createDecodeMiddleware, createRolesMiddleware } from '@falabella/middleware-token-validate';

const app = express();

// Solo decodifica, NO valida firma JWT
const decodeMiddleware = createDecodeMiddleware();

// Ruta protegida
app.get('/api/profile', decodeMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// Ruta con roles
app.get('/api/admin', 
  decodeMiddleware,
  createRolesMiddleware(['admin']),
  (req, res) => {
    res.json({ message: 'Admin area' });
  }
);
```

### Con NestJS (Validación Completa)

```typescript
import { Module } from '@nestjs/common';
import { TokenValidateModule, RolesGuard } from '@falabella/middleware-token-validate';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    TokenValidateModule.forRoot({
      jwtSecret: process.env.JWT_SECRET
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
```

### Con NestJS (Modo Decode-Only)

**Para cuando el token ya fue validado por API Gateway/Cloud Endpoints:**

```typescript
import { Module } from '@nestjs/common';
import { TokenValidateModule, RolesGuard } from '@falabella/middleware-token-validate';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    TokenValidateModule.forRoot({
      decodeOnly: true,  // 🔑 Solo decodifica, NO valida firma JWT
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
```

**Usar decoradores normalmente:**

```typescript
import { Controller, Get } from '@nestjs/common';
import { RequireResource, Roles } from '@falabella/middleware-token-validate';

@Controller('api')
export class ApiController {
  @Get('data')
  @RequireResource('my-api')
  @Roles('admin', 'user')
  getData() {
    return { message: 'Protected data' };
  }
}
```

### Usando el Core directamente

```typescript
import { validateToken, validateRoles } from '@falabella/middleware-token-validate';

// En cualquier aplicación Node.js
const result = validateToken(authHeader, {
  jwtSecret: 'your-secret-key'
});

if (result.success) {
  console.log('Usuario:', result.decoded);
  
  // Validar roles
  const roleCheck = validateRoles(result.decoded, {
    requiredRoles: ['admin'],
    requiredResource: 'my-api'
  });
}
```

## 📚 Documentación Completa

### Guías por Framework

- **[📘 Guía de Express](./EXPRESS-GUIDE.md)** - Uso completo con Express
- **[📗 Guía de NestJS](./NESTJS-GUIDE.md)** - Uso completo con NestJS
- **[📙 API Core](./CORE-API.md)** - Referencia del core puro
- **[⚡ Modo Decode-Only](./DECODE-ONLY-MODE.md)** - Para cuando el token ya fue validado por una capa anterior

### Características Específicas

- **[🔐 Validación de Tax ID](./TAX-ID-VALIDATION.md)**
- **[👥 Aliases de Roles](./ROLE-ALIASES-GUIDE.md)**
- **[☁️ Cloud Endpoints Architecture](./CLOUD-ENDPOINTS-ARCHITECTURE.md)**
- **[📖 Ejemplos Completos](../example-middleware-token-validate/)**

## 🔄 Migración desde v1.x

La v2.0 es **100% retrocompatible** con v1.x. Los imports antiguos siguen funcionando:

```typescript
// ✅ Código v1.x sigue funcionando
import { TokenValidateMiddleware, RolesGuard } from '@falabella/middleware-token-validate';
```

Pero puedes migrar gradualmente a los nuevos imports:

```typescript
// ✨ Nuevo en v2.0 - más flexible
import { createTokenMiddleware } from '@falabella/middleware-token-validate';
```

## 🎯 Casos de Uso

### 1. Validación Simple de Token

```typescript
import { createTokenMiddleware } from '@falabella/middleware-token-validate';

app.use(createTokenMiddleware({
  jwtSecret: 'secret'
}));
```

### 2. Validación de Roles en Recurso

```typescript
import { createTokenMiddleware, createRolesMiddleware } from '@falabella/middleware-token-validate';

app.get('/api/orders',
  createTokenMiddleware({ jwtSecret: 'secret' }),
  createRolesMiddleware(['orders-view'], 'market-insights-api'),
  handler
);
```

### 3. Validación de Tax ID

```typescript
import { createTokenMiddleware, createTaxIdMiddleware } from '@falabella/middleware-token-validate';

app.get('/api/companies/:tax_id',
  createTokenMiddleware({ jwtSecret: 'secret' }),
  createTaxIdMiddleware({ bypassRoles: ['admin'] }),
  handler
);
```

### 4. Validación Combinada

```typescript
import { createProtectedMiddleware } from '@falabella/middleware-token-validate';

app.put('/api/companies/:tax_id/settings',
  createProtectedMiddleware(
    { jwtSecret: 'secret' },
    { requiredRoles: ['company-admin'], requiredResource: 'my-api' },
    { bypassRoles: ['admin'] }
  ),
  handler
);
```

## 🛠️ API Principal

### Core Functions

```typescript
// Validación de tokens
function validateToken(authHeader: string, options: ValidationOptions): ValidationResult;
function verifyAndDecodeToken(token: string, options: ValidationOptions): ValidationResult;
function extractToken(authHeader: string): string | null;

// Validación de roles
function validateRoles(decoded: DecodedToken, options: RoleValidationOptions): ValidationResult;
function hasRole(decoded: DecodedToken, role: string, resource?: string): boolean;
function hasAnyRole(decoded: DecodedToken, roles: string[], resource?: string): boolean;

// Validación de Tax ID
function validateTaxId(decoded: DecodedToken, taxId: string, options?: TaxIdValidationOptions): ValidationResult;
function extractTaxId(request: any): string | null;
```

### Express Adapters

```typescript
function createTokenMiddleware(options: ValidationOptions): Middleware;
function createRolesMiddleware(roles: string[], resource?: string, useAliases?: boolean): Middleware;
function createRealmRolesMiddleware(roles: string[], useAliases?: boolean): Middleware;
function createTaxIdMiddleware(options?: TaxIdValidationOptions): Middleware;
function createProtectedMiddleware(...): Middleware;
```

### NestJS Adapters

```typescript
// Decoradores
@RequireResource(resource: string)
@Roles(...roles: string[])
@RealmRoles(...roles: string[])
@ValidateTaxId()
@UseRoleAliases()

// Clases
TokenValidateMiddleware
RolesGuard
TokenValidateModule
```

## 🔒 Seguridad

- Verifica tokens JWT con HS256 o RS256
- Valida `iss` (issuer) y `aud` (audience)
- Verifica expiración automáticamente
- Soporta bypass de verificación para desarrollo
- Validación de Tax ID para multi-tenancy

## 📄 Licencia

MIT

## 🤝 Contribuir

Ver [CONTRIBUTING.md](./CONTRIBUTING.md)

## 📝 Changelog

Ver [CHANGELOG.md](./CHANGELOG.md)

---

**v2.0.0** - Framework-agnostic architecture
**v1.0.0** - Initial NestJS-only release
