# Cómo Obtener la Clave Pública de Keycloak

## 🔑 Keycloak usa RS256 (No necesitas jwtSecret)

Keycloak firma los tokens con **claves asimétricas (RS256)**, no con un secreto compartido. Por lo tanto:
- ✅ **Usa `publicKey`** para verificar tokens de Keycloak
- ❌ **NO necesitas `jwtSecret`**

## Método 1: Obtener desde el Endpoint de Keycloak

Keycloak expone su clave pública en un endpoint público:

```bash
# Formato del URL
https://{keycloak-url}/auth/realms/{realm-name}

# Tu caso específico:
https://access-key-corp.falabella.tech/auth/realms/esti
```

### Pasos:

1. **Abre en el navegador o usa curl:**
```bash
curl https://access-key-corp.falabella.tech/auth/realms/esti
```

2. **Busca el campo `public_key` en la respuesta JSON:**
```json
{
  "realm": "esti",
  "public_key": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...",
  "token-service": "https://...",
  ...
}
```

3. **Convierte la clave al formato PEM:**
```typescript
const publicKeyRaw = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...";

const publicKey = `-----BEGIN PUBLIC KEY-----
${publicKeyRaw}
-----END PUBLIC KEY-----`;
```

## Método 2: Obtener desde el JWKS Endpoint

Keycloak también expone un endpoint JWKS (JSON Web Key Set):

```bash
curl https://access-key-corp.falabella.tech/auth/realms/esti/protocol/openid-connect/certs
```

Respuesta:
```json
{
  "keys": [
    {
      "kid": "xyz123",
      "kty": "RSA",
      "alg": "RS256",
      "use": "sig",
      "n": "...",
      "e": "AQAB"
    }
  ]
}
```

Si usas JWKS, puedes instalar `jwks-rsa`:
```bash
npm install jwks-rsa
```

## Configuración en tu Aplicación

### Opción 1: Hardcodear la Clave (Más simple)

```typescript
// app.module.ts
const KEYCLOAK_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END PUBLIC KEY-----`;

export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(new TokenValidateMiddleware({
        publicKey: KEYCLOAK_PUBLIC_KEY,
        issuer: 'https://access-key-corp.falabella.tech/auth/realms/esti',
        requiredResource: 'fbc-market-insights',
      }).use.bind(new TokenValidateMiddleware({
        publicKey: KEYCLOAK_PUBLIC_KEY,
        issuer: 'https://access-key-corp.falabella.tech/auth/realms/esti',
        requiredResource: 'fbc-market-insights',
      })))
      .forRoutes('*');
  }
}
```

### Opción 2: Desde Variable de Entorno

```bash
# .env
KEYCLOAK_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----"
KEYCLOAK_ISSUER="https://access-key-corp.falabella.tech/auth/realms/esti"
REQUIRED_RESOURCE="fbc-market-insights"
```

```typescript
// app.module.ts
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(new TokenValidateMiddleware({
        publicKey: process.env.KEYCLOAK_PUBLIC_KEY,
        issuer: process.env.KEYCLOAK_ISSUER,
        requiredResource: process.env.REQUIRED_RESOURCE,
      }).use.bind(new TokenValidateMiddleware({
        publicKey: process.env.KEYCLOAK_PUBLIC_KEY,
        issuer: process.env.KEYCLOAK_ISSUER,
        requiredResource: process.env.REQUIRED_RESOURCE,
      })))
      .forRoutes('*');
  }
}
```

### Opción 3: Solo para Desarrollo (Sin verificar firma)

⚠️ **ADVERTENCIA: SOLO PARA DESARROLLO - MUY INSEGURO**

```typescript
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(new TokenValidateMiddleware({
        skipVerification: true, // ⚠️ NO USAR EN PRODUCCIÓN
        requiredResource: 'fbc-market-insights',
      }).use.bind(new TokenValidateMiddleware({
        skipVerification: true,
        requiredResource: 'fbc-market-insights',
      })))
      .forRoutes('*');
  }
}
```

## Todas las Opciones de Configuración

```typescript
interface TokenValidateOptions {
  // Opción 1: Secret compartido (para HS256)
  jwtSecret?: string;
  
  // Opción 2: Clave pública (para RS256 - Keycloak) ✅ RECOMENDADO
  publicKey?: string;
  
  // Opción 3: Sin verificación (SOLO DESARROLLO)
  skipVerification?: boolean;
  
  // Opcionales pero recomendados
  issuer?: string; // Valida el emisor del token
  audience?: string | string[]; // Valida la audiencia
  
  // Validación de recursos y roles
  requiredResource?: string;
  requiredRoles?: string[];
  validateRealmRoles?: boolean;
}
```

## Ejemplos Completos

### Para Producción (Con clave pública)

```typescript
const middleware = new TokenValidateMiddleware({
  publicKey: KEYCLOAK_PUBLIC_KEY,
  issuer: 'https://access-key-corp.falabella.tech/auth/realms/esti',
  requiredResource: 'fbc-market-insights',
});
```

### Para Desarrollo (Sin verificación)

```typescript
const middleware = new TokenValidateMiddleware({
  skipVerification: true, // ⚠️ SOLO DESARROLLO
  requiredResource: 'fbc-market-insights',
});
```

### Con HS256 (Si tu servidor usa secret compartido)

```typescript
const middleware = new TokenValidateMiddleware({
  jwtSecret: 'tu-secreto-compartido',
  requiredResource: 'fbc-market-insights',
});
```

## Script para Obtener la Clave Automáticamente

```typescript
// get-keycloak-key.ts
import * as https from 'https';

const KEYCLOAK_URL = 'https://access-key-corp.falabella.tech/auth/realms/esti';

https.get(KEYCLOAK_URL, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const realm = JSON.parse(data);
    const publicKey = `-----BEGIN PUBLIC KEY-----
${realm.public_key}
-----END PUBLIC KEY-----`;
    
    console.log('Clave pública de Keycloak:');
    console.log(publicKey);
  });
});
```

Ejecutar:
```bash
ts-node get-keycloak-key.ts
```

## Verificar que Funcione

Prueba decodificar un token en [jwt.io](https://jwt.io) para verificar:
- El `iss` (issuer) debe coincidir con tu configuración
- El `aud` (audience) debe estar en tu lista si lo configuras
- Debe tener `resource_access` con tu recurso

## Resumen

| Método | Cuándo Usar |
|--------|-------------|
| `publicKey` | ✅ **RECOMENDADO** - Producción con Keycloak |
| `jwtSecret` | Si tu servidor usa HS256 (menos común) |
| `skipVerification` | ⚠️ **SOLO DESARROLLO** - Muy inseguro |

Para tu caso con Keycloak: **Usa `publicKey`**
