# Modo Decode-Only (Solo Decodificación)

## 📖 Descripción

Este modo está diseñado para cuando **NO necesitas validar la firma JWT** porque esa validación ya fue realizada por una capa anterior de tu arquitectura.

### ✅ Casos de Uso Comunes

- **API Gateway**: AWS API Gateway, Azure API Management, Google Cloud Endpoints
- **Service Mesh**: Istio, Linkerd con JWT validation
- **Reverse Proxy**: NGINX con jwt-auth module, Traefik
- **Cloud Functions**: Con autenticación JWT en el gateway
- **BFF Pattern**: Backend-for-Frontend que ya validó el token

### 🎯 ¿Qué hace este modo?

**SÍ hace:**
- ✅ Decodifica el token JWT
- ✅ Extrae los claims (sub, email, realm_access, resource_access, etc.)
- ✅ Valida roles de realm
- ✅ Valida roles de recursos
- ✅ Valida Tax ID
- ✅ Valida permisos

**NO hace:**
- ❌ NO valida la firma JWT
- ❌ NO valida issuer
- ❌ NO valida audience
- ❌ NO valida expiración (exp)
- ❌ NO hace llamadas a Keycloak

## 🚀 Uso

### Express

```typescript
import express from 'express';
import { createDecodeMiddleware, createRolesMiddleware } from '@falabella/middleware-token-validate';

const app = express();

// Solo decodifica el token (sin validar firma)
app.use(createDecodeMiddleware());

// Validar roles después
app.get('/api/admin', 
  createRolesMiddleware(['admin'], 'my-resource'),
  (req, res) => {
    res.json({ user: req.user });
  }
);
```

### NestJS

```typescript
import { Module } from '@nestjs/common';
import { TokenValidateModule } from '@falabella/middleware-token-validate';

@Module({
  imports: [
    TokenValidateModule.forRoot({
      decodeOnly: true,  // 🔑 Activar modo decode-only
      // No necesitas jwtSecret, publicKey, issuer, audience
    }),
  ],
})
export class AppModule {}
```

Usar los decoradores normalmente:

```typescript
import { Controller, Get } from '@nestjs/common';
import { RealmRoles, Roles, RequireResource } from '@falabella/middleware-token-validate';

@Controller('api')
export class MyController {
  @Get('admin')
  @RealmRoles('admin')
  async getAdminData() {
    return { message: 'Admin access' };
  }

  @Get('orders')
  @RequireResource('my-resource')
  @Roles('order-viewer', 'order-manager')
  async getOrders() {
    return { orders: [] };
  }
}
```

## 🏗️ Arquitectura Recomendada

```
┌─────────────────┐
│   Client App    │
└────────┬────────┘
         │ JWT Token
         ▼
┌─────────────────┐
│  API Gateway    │ ◄── Valida firma JWT aquí
│  (Cloud)        │     - Issuer
└────────┬────────┘     - Audience
         │              - Expiración
         │ Token válido - Firma
         ▼
┌─────────────────┐
│  Your NestJS/   │ ◄── Solo decodifica y valida permisos
│  Express App    │     - Roles
└─────────────────┘     - Resource access
                        - Tax ID
```

## ⚙️ Configuración

### Express - Modo Decode Only

```typescript
import { createDecodeMiddleware } from '@falabella/middleware-token-validate';

// Sin opciones (modo básico)
app.use(createDecodeMiddleware());

// Con validación de recursos (opcional)
app.use(createDecodeMiddleware({
  requiredResource: 'my-resource'  // Validar que el token tenga acceso a este recurso
}));
```

### NestJS - Modo Decode Only

```typescript
TokenValidateModule.forRoot({
  decodeOnly: true,           // 🔑 Modo decode-only
  taxIdBypassRoles: ['admin'] // Opcional: roles que pueden saltarse validación de Tax ID
})
```

## 📝 Comparación con Modo Normal

| Característica | Modo Normal | Modo Decode-Only |
|---------------|-------------|------------------|
| Valida firma JWT | ✅ Sí | ❌ No |
| Valida issuer | ✅ Sí | ❌ No |
| Valida audience | ✅ Sí | ❌ No |
| Valida expiración | ✅ Sí | ❌ No |
| Decodifica token | ✅ Sí | ✅ Sí |
| Valida roles | ✅ Sí | ✅ Sí |
| Valida recursos | ✅ Sí | ✅ Sí |
| Valida Tax ID | ✅ Sí | ✅ Sí |
| Requiere secret/publicKey | ✅ Sí | ❌ No |
| Performance | Medio | 🚀 Alto |
| Seguridad | 🔒 Alta | ⚠️ Depende del Gateway |

## 🔒 Consideraciones de Seguridad

### ✅ Seguro cuando:

1. **Gateway Validado**: Tu API Gateway/Proxy valida correctamente:
   - Firma JWT
   - Issuer correcto
   - Audience correcto
   - Token no expirado
   - Certificados válidos

2. **Red Privada**: Tu app está en una red privada detrás del gateway

3. **No Acceso Directo**: Los clientes NO pueden acceder directamente a tu app

### ⚠️ NO usar cuando:

1. Tu app es accesible directamente desde Internet
2. No tienes un API Gateway validando tokens
3. No confías en la capa anterior
4. Necesitas máxima seguridad end-to-end

## 🧪 Ejemplo Completo

### Express con Cloud Endpoints

```typescript
// server.ts
import express from 'express';
import { 
  createDecodeMiddleware, 
  createRealmRolesMiddleware,
  createProtectedMiddleware 
} from '@falabella/middleware-token-validate';

const app = express();

// Cloud Endpoints ya validó el token, solo decodificamos
app.use(createDecodeMiddleware());

// Endpoints públicos
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Solo admins
app.get('/api/admin/users', 
  createRealmRolesMiddleware(['admin']),
  (req, res) => {
    res.json({ users: [] });
  }
);

// Validación combinada
app.post('/api/companies/:tax_id/settings',
  createProtectedMiddleware({
    resource: 'companies-api',
    roles: ['company-admin', 'company-owner'],
    validateTaxId: true
  }),
  (req, res) => {
    res.json({ success: true });
  }
);

app.listen(8080);
```

### NestJS con Azure API Management

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { TokenValidateModule } from '@falabella/middleware-token-validate';

@Module({
  imports: [
    TokenValidateModule.forRoot({
      decodeOnly: true,  // Azure APIM ya validó el token
      taxIdBypassRoles: ['admin', 'superadmin']
    }),
  ],
})
export class AppModule {}

// admin.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { RealmRoles, RolesGuard } from '@falabella/middleware-token-validate';

@Controller('admin')
@UseGuards(RolesGuard)
export class AdminController {
  @Get('dashboard')
  @RealmRoles('admin')
  async getDashboard() {
    return { message: 'Admin dashboard' };
  }
}

// companies.controller.ts
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { 
  Roles, 
  RequireResource, 
  ValidateTaxId,
  RolesGuard 
} from '@falabella/middleware-token-validate';

@Controller('companies')
@UseGuards(RolesGuard)
export class CompaniesController {
  @Get(':tax_id')
  @RequireResource('companies-api')
  @Roles('company-viewer')
  @ValidateTaxId()
  async getCompany(@Param('tax_id') taxId: string) {
    return { tax_id: taxId, name: 'Company Name' };
  }
}
```

## 🧩 API Core

Si quieres usar el core directamente:

```typescript
import { 
  decodeTokenWithoutValidation,
  decodeAndValidatePermissions,
  extractToken 
} from '@falabella/middleware-token-validate/core';

// Solo decodificar
const token = extractToken(authHeader);
const result = decodeTokenWithoutValidation(token);

if (result.success) {
  console.log(result.decoded.sub);
  console.log(result.decoded.realm_access.roles);
}

// Decodificar y validar permisos
const fullResult = decodeAndValidatePermissions(authHeader, {
  requiredResource: 'my-resource',
  requiredRoles: ['admin']
});
```

## 📊 Performance

Modo decode-only es ~**5-10x más rápido** que validar firma JWT:

```
Validar firma JWT:    ~5-15ms
Solo decodificar:     ~0.5-1ms
```

Ideal para microservicios de alta frecuencia donde el gateway ya validó el token.

## ❓ FAQ

**P: ¿Es seguro?**  
R: Sí, si tu API Gateway valida correctamente el token y tu app no es accesible directamente.

**P: ¿Puedo cambiar entre modos?**  
R: Sí, es solo cambiar `decodeOnly: true/false` en la configuración.

**P: ¿Funciona con Keycloak?**  
R: Sí, funciona con tokens de cualquier proveedor JWT (Keycloak, Auth0, Okta, etc.)

**P: ¿Qué pasa si llega un token inválido?**  
R: Se rechaza igual. Se valida que sea un JWT decodificable y tenga los claims necesarios.

**P: ¿Puedo usar ambos modos en la misma app?**  
R: En Express sí (usa diferentes middlewares). En NestJS solo un modo global.

## 🔗 Ver También

- [EXPRESS-GUIDE.md](./EXPRESS-GUIDE.md) - Guía completa de Express
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitectura del middleware
- [CLOUD-ENDPOINTS-ARCHITECTURE.md](./CLOUD-ENDPOINTS-ARCHITECTURE.md) - Uso con Cloud Endpoints
