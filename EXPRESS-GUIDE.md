# Guía Completa: Uso con Express

Esta guía muestra cómo usar el middleware en aplicaciones **Express puras**.

## Instalación

```bash
npm install @falabella/middleware-token-validate express
npm install --save-dev @types/express @types/node
```

## Importaciones

```typescript
import express from 'express';
import {
  createTokenMiddleware,
  createRolesMiddleware,
  createRealmRolesMiddleware,
  createTaxIdMiddleware,
  createProtectedMiddleware
} from '@falabella/middleware-token-validate';
```

## 1. Validación Básica de Token

```typescript
const app = express();

// Crear middleware de validación
const tokenMiddleware = createTokenMiddleware({
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  issuer: 'https://keycloak.example.com/realms/my-realm',
  audience: 'account',
});

// Aplicar a ruta específica
app.get('/api/profile', tokenMiddleware, (req, res) => {
  const user = (req as any).user;
  res.json({ 
    sub: user.sub,
    email: user.email,
    name: user.name 
  });
});

// O aplicar globalmente
app.use('/api', tokenMiddleware);
```

## 2. Validación de Roles

### Roles en realm_access

```typescript
app.get('/api/admin/users',
  tokenMiddleware,
  createRealmRolesMiddleware(['admin', 'superadmin']),
  (req, res) => {
    res.json({ users: [] });
  }
);
```

### Roles en recurso específico

```typescript
app.get('/api/orders',
  tokenMiddleware,
  createRolesMiddleware(['orders-view', 'orders-admin'], 'market-insights-api'),
  (req, res) => {
    res.json({ orders: [] });
  }
);
```

### Con aliases de roles

```typescript
app.get('/api/dashboard',
  tokenMiddleware,
  createRealmRolesMiddleware(['Admin', 'Manager'], true), // true = usar aliases
  (req, res) => {
    res.json({ dashboard: 'data' });
  }
);
```

## 3. Validación de Tax ID

### En parámetros de ruta

```typescript
app.get('/api/companies/:tax_id/info',
  tokenMiddleware,
  createTaxIdMiddleware({
    bypassRoles: ['admin', 'superadmin'],
    resource: 'market-insights-api'
  }),
  (req, res) => {
    res.json({ taxId: req.params.tax_id });
  }
);
```

### En body del request

```typescript
app.post('/api/companies/create',
  express.json(),
  tokenMiddleware,
  createTaxIdMiddleware(),
  (req, res) => {
    const { tax_id, name } = req.body;
    res.json({ company: { tax_id, name } });
  }
);
```

## 4. Validaciones Combinadas

### Método 1: Encadenar middlewares

```typescript
app.put('/api/companies/:tax_id/settings',
  tokenMiddleware,
  createRolesMiddleware(['company-admin'], 'market-insights-api'),
  createTaxIdMiddleware({ bypassRoles: ['admin'] }),
  (req, res) => {
    res.json({ updated: true });
  }
);
```

### Método 2: Middleware combinado

```typescript
const protectedMiddleware = createProtectedMiddleware(
  // Token options
  {
    jwtSecret: process.env.JWT_SECRET,
    issuer: 'https://keycloak.example.com/realms/my-realm'
  },
  // Role options
  {
    requiredRoles: ['company-admin'],
    requiredResource: 'market-insights-api'
  },
  // Tax ID options
  {
    bypassRoles: ['admin']
  }
);

app.put('/api/companies/:tax_id/settings', protectedMiddleware, (req, res) => {
  res.json({ updated: true });
});
```

## 5. Configuración Avanzada

### Usar Public Key (RS256)

```typescript
import fs from 'fs';

const tokenMiddleware = createTokenMiddleware({
  publicKey: fs.readFileSync('./keys/public.pem', 'utf8'),
  issuer: 'https://keycloak.example.com/realms/my-realm',
  audience: 'account'
});
```

### Modo desarrollo (sin verificación)

```typescript
const tokenMiddleware = createTokenMiddleware({
  skipVerification: process.env.NODE_ENV === 'development',
  jwtSecret: process.env.JWT_SECRET
});
```

## 6. Manejo de Errores

Los middlewares devuelven respuestas JSON estándar:

```json
{
  "statusCode": 401,
  "message": "Token no proporcionado",
  "error": "Unauthorized"
}
```

### Error handler personalizado

```typescript
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(err.statusCode || 500).json({
    statusCode: err.statusCode || 500,
    message: err.message || 'Error interno',
    error: err.name || 'Internal Server Error',
    timestamp: new Date().toISOString(),
    path: req.path
  });
});
```

## 7. Ejemplo Completo

```typescript
import express, { Request, Response } from 'express';
import {
  createTokenMiddleware,
  createRealmRolesMiddleware,
  createRolesMiddleware,
  createTaxIdMiddleware
} from '@falabella/middleware-token-validate';

const app = express();
app.use(express.json());

// Configurar middleware de token
const tokenMiddleware = createTokenMiddleware({
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  skipVerification: process.env.NODE_ENV === 'development',
  issuer: 'https://keycloak.example.com/realms/my-realm',
});

// Rutas públicas
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Rutas protegidas con diferentes niveles
app.get('/api/profile', tokenMiddleware, (req, res) => {
  res.json({ user: (req as any).user });
});

app.get('/api/admin/users',
  tokenMiddleware,
  createRealmRolesMiddleware(['admin']),
  (req, res) => {
    res.json({ users: [] });
  }
);

app.get('/api/orders',
  tokenMiddleware,
  createRolesMiddleware(['orders-view'], 'market-insights-api'),
  (req, res) => {
    res.json({ orders: [] });
  }
);

app.get('/api/companies/:tax_id',
  tokenMiddleware,
  createTaxIdMiddleware({ bypassRoles: ['admin'] }),
  (req, res) => {
    res.json({ company: req.params.tax_id });
  }
);

// Manejo de errores
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error(err);
  res.status(err.statusCode || 500).json({
    statusCode: err.statusCode || 500,
    message: err.message || 'Error interno',
    error: err.name || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## 8. Testing

```typescript
import request from 'supertest';
import app from './app';

describe('Protected Routes', () => {
  const validToken = 'Bearer eyJhbGc...';
  
  it('should reject requests without token', async () => {
    const response = await request(app)
      .get('/api/profile')
      .expect(401);
    
    expect(response.body.message).toContain('Token no proporcionado');
  });

  it('should accept requests with valid token', async () => {
    const response = await request(app)
      .get('/api/profile')
      .set('Authorization', validToken)
      .expect(200);
    
    expect(response.body.user).toBeDefined();
  });
});
```

## Ver También

- [API Core](./CORE-API.md)
- [Validación de Tax ID](./TAX-ID-VALIDATION.md)
- [Ejemplos Completos](../example-middleware-token-validate/)
