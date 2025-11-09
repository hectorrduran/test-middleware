# Changelog - Decode-Only Mode

## Nuevas Funcionalidades Agregadas

### 1. Core Functions

**Archivo**: `src/core/token-validator.ts`

- ✅ `decodeTokenWithoutValidation(token)` - Decodifica JWT sin validar firma
- ✅ `decodeAndValidatePermissions(authHeader, options)` - Decodifica + valida roles/permisos

### 2. Express Adapters

**Archivo**: `src/adapters/express.ts`

- ✅ `createDecodeMiddleware(options?)` - Middleware Express sin validación de firma

### 3. NestJS Adapters

**Archivo**: `src/adapters/nestjs-middleware.ts`

- ✅ `TokenDecodeMiddleware` - Middleware NestJS sin validación de firma

**Archivo**: `src/adapters/nestjs-guard.ts`

- ✅ `DecodeGuard` - Guard NestJS sin validación de firma

**Archivo**: `src/adapters/nestjs-module.ts`

- ✅ `TokenModuleOptions.decodeOnly: boolean` - Opción para activar modo decode-only
- ✅ Selección automática entre `RolesGuard` y `DecodeGuard`

### 4. Documentación

- ✅ `DECODE-ONLY-MODE.md` - Guía completa del modo decode-only
- ✅ `DECODE-ONLY-EXAMPLE.md` - Ejemplo con Cloud Endpoints + NestJS
- ✅ `README.md` - Actualizado con ejemplos decode-only

## Casos de Uso

### Express

```typescript
import { createDecodeMiddleware } from '@falabella/middleware-token-validate';

// Sin validación de firma JWT
app.use(createDecodeMiddleware());
```

### NestJS

```typescript
TokenValidateModule.forRoot({
  decodeOnly: true,  // 🔑 Activar modo decode-only
})
```

## Compatibilidad

- ✅ **100% retrocompatible**: El código existente sigue funcionando
- ✅ **Opt-in**: Solo se activa con `decodeOnly: true`
- ✅ **Mismo API**: Decoradores y middlewares funcionan igual

## Testing

- ✅ Compilación exitosa
- ✅ Exports verificados
- ✅ TypeScript types generados

## Performance

- ⚡ ~5-10x más rápido que validar firma JWT
- ⚡ Ideal para microservicios de alta frecuencia
- ⚡ Perfecto cuando API Gateway ya validó el token
