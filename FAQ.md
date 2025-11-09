# Respuesta Rápida: ¿Necesito jwtSecret?

## ❌ NO, el `jwtSecret` NO es obligatorio

Tienes **3 opciones** para configurar la validación:

### 1. ✅ Con Clave Pública (RECOMENDADO para Keycloak)

```typescript
new TokenValidateMiddleware({
  publicKey: KEYCLOAK_PUBLIC_KEY, // Clave pública de Keycloak
  issuer: 'https://access-key-corp.falabella.tech/auth/realms/esti',
  requiredResource: 'fbc-market-insights',
})
```

**Cuándo usar:** Producción con Keycloak (RS256)

### 2. Con Secret Compartido (Para HS256)

```typescript
new TokenValidateMiddleware({
  jwtSecret: 'tu-secreto-compartido',
  requiredResource: 'fbc-market-insights',
})
```

**Cuándo usar:** Si tu servidor usa HS256 (menos común)

### 3. ⚠️ Sin Verificación (SOLO DESARROLLO)

```typescript
new TokenValidateMiddleware({
  skipVerification: true, // ⚠️ MUY INSEGURO - Solo desarrollo
  requiredResource: 'fbc-market-insights',
})
```

**Cuándo usar:** Desarrollo local únicamente

---

## Para tu caso con Keycloak:

```typescript
// 1. Obtén la clave pública de:
// https://access-key-corp.falabella.tech/auth/realms/esti

const KEYCLOAK_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END PUBLIC KEY-----`;

// 2. Configura el middleware:
consumer
  .apply(new TokenValidateMiddleware({
    publicKey: KEYCLOAK_PUBLIC_KEY, // ✅ Usa esto, no jwtSecret
    issuer: 'https://access-key-corp.falabella.tech/auth/realms/esti',
    requiredResource: 'fbc-market-insights',
  }).use.bind(new TokenValidateMiddleware({
    publicKey: KEYCLOAK_PUBLIC_KEY,
    issuer: 'https://access-key-corp.falabella.tech/auth/realms/esti',
    requiredResource: 'fbc-market-insights',
  })))
  .forRoutes('*');
```

Ver **KEYCLOAK-SETUP.md** para instrucciones detalladas de cómo obtener la clave pública.
