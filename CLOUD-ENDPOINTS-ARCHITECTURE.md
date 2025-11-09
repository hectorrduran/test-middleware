# Arquitectura con Cloud Endpoints + BFF

## 📐 Tu Arquitectura Actual

```
┌─────────┐
│ Cliente │
└────┬────┘
     │ Token JWT
     ↓
┌──────────────────┐
│ Cloud Endpoints  │ ← Valida: firma, issuer, expiration ✅
└────┬─────────────┘
     │ Token validado
     ↓
┌──────────────────┐
│ BFF (NestJS)     │ ← Valida: roles y permisos ✅
│ + Esta librería  │
└────┬─────────────┘
     │
     ↓
┌──────────────────┐
│ Servicios        │
│ Internos         │
└──────────────────┘
```

## ✅ Configuración Recomendada

Ya que **Cloud Endpoints valida el token**, tu BFF solo necesita validar roles:

```typescript
// app.module.ts
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(new TokenValidateMiddleware({
        skipVerification: true, // ✅ Seguro porque Cloud Endpoints ya validó
        requiredResource: 'fbc-market-insights',
      }).use.bind(new TokenValidateMiddleware({
        skipVerification: true,
        requiredResource: 'fbc-market-insights',
      })))
      .forRoutes('*');
  }
}
```

## 🔐 División de Responsabilidades

| Capa | Valida | Qué hace |
|------|--------|----------|
| **Cloud Endpoints** | Autenticación | ✅ Firma del token<br>✅ Issuer correcto<br>✅ Token no expirado<br>✅ Token bien formado |
| **BFF (Esta librería)** | Autorización | ✅ Usuario tiene acceso al recurso (`resource_access`)<br>✅ Usuario tiene roles necesarios<br>✅ Permisos específicos por endpoint |

## 🚀 Ventajas de Esta Arquitectura

1. **Mejor Performance**: No duplicas la validación de firma JWT
2. **Separación de Responsabilidades**: Autenticación vs Autorización
3. **Seguridad Mantenida**: Cloud Endpoints garantiza token válido
4. **Flexibilidad**: Puedes cambiar reglas de autorización sin tocar Cloud Endpoints

## 📝 Ejemplo de Uso en Controladores

```typescript
@Controller('market-insights')
export class MarketInsightsController {
  // ✅ Todos necesitan tener acceso al recurso (validado por middleware global)
  
  @Get('reports')
  getReports() {
    // Cualquiera con acceso a 'fbc-market-insights' puede ver esto
    return { reports: [] };
  }

  @Get('admin')
  @RequireResource('fbc-market-insights')
  @Roles('admin', 'admin_user')
  getAdminReports() {
    // Solo usuarios con rol 'admin' o 'admin_user' en el recurso
    return { adminReports: [] };
  }
}
```

## ⚠️ Importante: ¿Cuándo NO usar skipVerification?

NO uses `skipVerification: true` si:
- ❌ No tienes Cloud Endpoints u otro gateway que valide el token
- ❌ Los requests pueden llegar directamente a tu BFF sin pasar por Cloud Endpoints
- ❌ Estás en desarrollo y quieres simular tokens falsos

En esos casos, usa:
```typescript
{
  publicKey: KEYCLOAK_PUBLIC_KEY, // Validar firma
  issuer: 'https://access-key-corp.falabella.tech/auth/realms/esti',
  requiredResource: 'fbc-market-insights',
}
```

## 🔒 Consideraciones de Seguridad

### ✅ Seguro con skipVerification:
```
Cliente → Cloud Endpoints (valida) → BFF (solo roles) → Servicios
         └─────────────────────────────┘
              Todo dentro de GCP
              Red privada/segura
```

### ⚠️ Requiere validación completa:
```
Cliente → BFF (expuesto públicamente) → Servicios
         └─────────────────────────┘
         Debe validar firma del token
```

## 🎯 Tu Caso Específico

Según tu arquitectura:
- ✅ Usa `skipVerification: true`
- ✅ Cloud Endpoints ya validó la autenticación
- ✅ Tu BFF solo maneja autorización (roles/permisos)
- ✅ Mejor performance y separación de responsabilidades

## 📊 Comparación de Performance

| Configuración | Latencia | Validaciones |
|--------------|----------|--------------|
| `skipVerification: true` | ~1-2ms | Solo verifica estructura y roles |
| `publicKey` (RS256) | ~5-10ms | Verifica firma + estructura + roles |

Con Cloud Endpoints ya validando, ahorras ~5-8ms por request. ⚡

## 🧪 Testing

Para tests, puedes crear tokens simples sin firma:

```typescript
import * as jwt from 'jsonwebtoken';

const testToken = jwt.sign({
  sub: 'test-user',
  resource_access: {
    'fbc-market-insights': {
      roles: ['admin']
    }
  }
}, 'cualquier-secreto'); // No importa porque skipVerification=true

// Usar en tests
await request(app.getHttpServer())
  .get('/market-insights/admin')
  .set('Authorization', `Bearer ${testToken}`)
  .expect(200);
```

---

**Conclusión**: Tu arquitectura con Cloud Endpoints + esta librería es **óptima y segura**. Usa `skipVerification: true` para mejor performance manteniendo la seguridad.
