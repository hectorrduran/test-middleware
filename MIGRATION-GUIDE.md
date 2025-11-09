# Guía de Migración a v2.0

Esta guía te ayudará a migrar de la v1.x a la v2.0 del middleware.

## ¿Necesito migrar?

**NO**, la v2.0 es 100% retrocompatible. Tu código actual seguirá funcionando sin cambios.

Sin embargo, la v2.0 ofrece nuevas características y mejor arquitectura que podrías querer aprovechar.

## Cambios Principales

### v1.x (NestJS only)
```typescript
import { TokenValidateMiddleware } from '@falabella/middleware-token-validate';
// Solo funciona con NestJS
```

### v2.0 (Framework-agnostic)
```typescript
// Core puro (sin frameworks)
import { validateToken } from '@falabella/middleware-token-validate';

// Para Express
import { createTokenMiddleware } from '@falabella/middleware-token-validate';

// Para NestJS (mismo que v1.x)
import { TokenValidateMiddleware } from '@falabella/middleware-token-validate';
```

## Escenarios de Migración

### Escenario 1: Proyecto NestJS Existente

**No necesitas hacer nada**, tu código sigue funcionando:

```typescript
// ✅ Este código de v1.x sigue funcionando en v2.0
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

### Escenario 2: Quiero usar con Express

**Ahora puedes hacerlo** sin instalar NestJS:

```typescript
import express from 'express';
import { createTokenMiddleware } from '@falabella/middleware-token-validate';

const app = express();

const auth = createTokenMiddleware({
  jwtSecret: process.env.JWT_SECRET
});

app.get('/api/data', auth, (req, res) => {
  res.json({ data: 'protected' });
});
```

### Escenario 3: Quiero usar solo el Core

**Ahora puedes hacerlo** sin frameworks:

```typescript
import { validateToken, validateRoles } from '@falabella/middleware-token-validate';

// En cualquier función
async function checkAuth(authHeader: string) {
  const result = validateToken(authHeader, {
    jwtSecret: process.env.JWT_SECRET
  });
  
  if (result.success) {
    console.log('Usuario válido:', result.decoded);
    return result.decoded;
  }
  
  throw new Error(result.error?.message);
}
```

## Migración Gradual (Opcional)

Si quieres aprovechar las nuevas características gradualmente:

### Paso 1: Actualizar package.json

```bash
npm install @falabella/middleware-token-validate@2.0.0
```

### Paso 2: Probar que todo funciona

Tu código existente debería seguir funcionando sin cambios.

### Paso 3: Migrar gradualmente (opcional)

#### Antes (v1.x):
```typescript
import { 
  TokenValidateMiddleware,
  RolesGuard,
  Roles,
  RequireResource 
} from '@falabella/middleware-token-validate';
```

#### Después (v2.0 - opcional):
```typescript
// Imports más específicos y claros
import { 
  TokenValidateModule,
  RolesGuard,
  Roles,
  RequireResource,
  RealmRoles,
  UseRoleAliases
} from '@falabella/middleware-token-validate';

// Nuevos decoradores disponibles
@RealmRoles('Admin', 'Manager')
@UseRoleAliases()  // Habilita uso de aliases
getData() {
  return { data: 'admin or manager only' };
}
```

## Nuevas Características en v2.0

### 1. Soporte para Express Puro

```typescript
import { 
  createTokenMiddleware,
  createRolesMiddleware,
  createTaxIdMiddleware 
} from '@falabella/middleware-token-validate';
```

### 2. Core Framework-Agnostic

```typescript
import { 
  validateToken,
  validateRoles,
  validateTaxId,
  extractToken
} from '@falabella/middleware-token-validate';
```

### 3. Middleware Combinado (Express)

```typescript
import { createProtectedMiddleware } from '@falabella/middleware-token-validate';

app.put('/api/resource/:tax_id',
  createProtectedMiddleware(
    { jwtSecret: 'secret' },
    { requiredRoles: ['admin'], requiredResource: 'my-api' },
    { bypassRoles: ['superadmin'] }
  ),
  handler
);
```

### 4. Nuevos Decoradores (NestJS)

```typescript
import { RealmRoles, UseRoleAliases } from '@falabella/middleware-token-validate';

@RealmRoles('Admin', 'Manager')
@UseRoleAliases()  // Resuelve 'Admin' a ['admin', 'super-admin', 'system-admin']
getAdminData() {
  return { data: 'admin' };
}
```

## Dependencias

### Antes (v1.x)
```json
{
  "peerDependencies": {
    "@nestjs/common": "^10.0.0",  // ❌ Obligatorio
    "@nestjs/core": "^10.0.0",     // ❌ Obligatorio
    "jsonwebtoken": "^9.0.0"       // ❌ Obligatorio
  }
}
```

### Ahora (v2.0)
```json
{
  "dependencies": {
    "jsonwebtoken": "^9.0.0"       // ✅ Siempre incluido
  },
  "peerDependencies": {
    "@nestjs/common": "^10.0.0",  // ✅ Opcional
    "@nestjs/core": "^10.0.0",     // ✅ Opcional
    "express": "^4.18.0"           // ✅ Opcional
  }
}
```

Solo instalas lo que necesitas:
- **Express**: No necesitas NestJS
- **NestJS**: No necesitas Express  
- **Core solo**: No necesitas ningún framework

## Resolución de Problemas

### Error: "Cannot find module '@nestjs/common'"

**Causa**: Estás usando adaptador de NestJS pero no tienes las dependencias.

**Solución**:
```bash
npm install @nestjs/common @nestjs/core reflect-metadata rxjs
```

### Error: "Cannot find module 'express'"

**Causa**: Estás usando adaptador de Express pero no lo tienes instalado.

**Solución**:
```bash
npm install express
npm install --save-dev @types/express
```

### Mi código de v1.x no funciona

**Verifica**:
1. ¿Actualizaste a v2.0.0? `npm list @falabella/middleware-token-validate`
2. ¿Tienes las peer dependencies de NestJS instaladas?
3. ¿Hay errores de compilación? `npm run build`

Si persiste el problema, abre un issue en GitHub.

## Ventajas de Migrar

1. **Mejor estructura**: Core separado de adaptadores
2. **Más flexible**: Usa con cualquier framework
3. **Menos dependencias**: Solo instala lo que necesitas
4. **Mejor documentación**: Guías específicas por framework
5. **Más funciones**: Nuevos middlewares y decoradores

## Recursos

- [README v2.0](./README-v2.md)
- [Guía de Express](./EXPRESS-GUIDE.md)
- [Resumen de Refactorización](./REFACTORING-SUMMARY.md)
- [Ejemplos](../example-middleware-token-validate/)

## Preguntas Frecuentes

### ¿Tengo que migrar ahora?
No, tu código v1.x seguirá funcionando indefinidamente.

### ¿Hay breaking changes?
No, la v2.0 es 100% retrocompatible.

### ¿Puedo usar Express sin NestJS ahora?
Sí, ese es uno de los principales beneficios de v2.0.

### ¿Qué ventaja tengo si solo uso NestJS?
- Nuevos decoradores (@RealmRoles, @UseRoleAliases)
- Mejor organización del código
- Más fácil de testear
- Preparado para futuras expansiones

### ¿Debo cambiar mis imports?
No es necesario, pero puedes hacerlo para aprovechar las nuevas características.
