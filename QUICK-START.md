# Configuración Rápida según tu Arquitectura

## Escenario 1: Con Cloud Endpoints (o API Gateway)
**✅ Tu caso - RECOMENDADO**

Si ya tienes un gateway que valida el token (Cloud Endpoints, Kong, AWS API Gateway, etc.):

```typescript
consumer.apply(new TokenValidateMiddleware({
  skipVerification: true, // ✅ Seguro porque el gateway ya validó
  requiredResource: 'fbc-market-insights',
}).use.bind(new TokenValidateMiddleware({
  skipVerification: true,
  requiredResource: 'fbc-market-insights',
})))
.forRoutes('*');
```

**Por qué es seguro:**
- El gateway ya validó la firma, issuer y expiration
- Tu BFF solo valida roles/permisos (autorización)
- Mejor performance (~5-8ms más rápido)

---

## Escenario 2: Sin Gateway (BFF expuesto directamente)

Si los requests llegan directamente a tu BFF:

```typescript
consumer.apply(new TokenValidateMiddleware({
  publicKey: KEYCLOAK_PUBLIC_KEY, // Obtener de Keycloak
  issuer: 'https://access-key-corp.falabella.tech/auth/realms/esti',
  requiredResource: 'fbc-market-insights',
}).use.bind(new TokenValidateMiddleware({
  publicKey: KEYCLOAK_PUBLIC_KEY,
  issuer: 'https://access-key-corp.falabella.tech/auth/realms/esti',
  requiredResource: 'fbc-market-insights',
})))
.forRoutes('*');
```

---

## Escenario 3: Desarrollo Local

Para desarrollo sin token real:

```typescript
consumer.apply(new TokenValidateMiddleware({
  skipVerification: true, // ⚠️ Solo desarrollo
  requiredResource: 'fbc-market-insights',
}).use.bind(new TokenValidateMiddleware({
  skipVerification: true,
  requiredResource: 'fbc-market-insights',
})))
.forRoutes('*');
```

---

Ver **CLOUD-ENDPOINTS-ARCHITECTURE.md** para más detalles sobre arquitecturas con gateway.
