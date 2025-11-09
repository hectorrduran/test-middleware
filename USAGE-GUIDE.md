# Guía de Uso para Tokens de Keycloak/Falabella

Esta librería está diseñada para validar tokens JWT de Keycloak con la estructura de `resource_access` utilizada en Falabella.

## 🔑 Estructura del Token

Los tokens de Keycloak tienen dos tipos de acceso a roles:

1. **`resource_access`**: Roles específicos por aplicación/recurso
2. **`realm_access`**: Roles globales del realm

```json
{
  "sub": "54d75494-40ad-46ce-8b05-e6d3369eae93",
  "email": "hrduran@falabella.cl",
  "resource_access": {
    "fbc-market-insights": {
      "roles": ["admin", "admin_user", "admin_view"]
    },
    "cost-management": {
      "roles": ["document-admin", "view-document", "accounting-admin"]
    },
    "fbc-pom": {
      "roles": ["view"]
    }
  },
  "realm_access": {
    "roles": ["vendor", "offline_access", "Realm-admin"]
  }
}
```

## 🚀 Casos de Uso Comunes

### Caso 1: Validar que el usuario tenga acceso a tu aplicación

Si tu aplicación es `fbc-market-insights`:

```typescript
// app.module.ts
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(new TokenValidateMiddleware({
        jwtSecret: process.env.JWT_SECRET,
        requiredResource: 'fbc-market-insights', // ✅ Solo permite acceso si tiene este recurso
      }).use.bind(new TokenValidateMiddleware({
        jwtSecret: process.env.JWT_SECRET,
        requiredResource: 'fbc-market-insights',
      })))
      .forRoutes('*'); // Aplica a todas las rutas
  }
}
```

**Resultado**: 
- ✅ Pasa si el token tiene `resource_access['fbc-market-insights']`
- ❌ Rechaza si no tiene acceso a ese recurso

---

### Caso 2: Validar recurso + roles específicos

Si necesitas que el usuario tenga roles específicos dentro del recurso:

```typescript
@Controller('admin')
export class AdminController {
  @Get('dashboard')
  @RequireResource('fbc-market-insights')
  @Roles('admin', 'admin_user') // ✅ Solo estos roles pueden acceder
  getAdminDashboard() {
    return { message: 'Dashboard de administrador' };
  }
}
```

**Resultado**:
- ✅ Pasa si tiene el recurso Y tiene rol `admin` o `admin_user`
- ❌ Rechaza si tiene el recurso pero NO tiene esos roles

---

### Caso 3: Diferentes recursos para diferentes endpoints

Si tu API sirve a múltiples aplicaciones:

```typescript
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Solo usuarios de market insights
    consumer
      .apply(new TokenValidateMiddleware({
        jwtSecret: process.env.JWT_SECRET,
        requiredResource: 'fbc-market-insights',
      }).use.bind(new TokenValidateMiddleware({
        jwtSecret: process.env.JWT_SECRET,
        requiredResource: 'fbc-market-insights',
      })))
      .forRoutes('market-insights/*');

    // Solo usuarios de cost management
    consumer
      .apply(new TokenValidateMiddleware({
        jwtSecret: process.env.JWT_SECRET,
        requiredResource: 'cost-management',
      }).use.bind(new TokenValidateMiddleware({
        jwtSecret: process.env.JWT_SECRET,
        requiredResource: 'cost-management',
      })))
      .forRoutes('cost-management/*');
  }
}
```

---

### Caso 4: Validar solo que tenga ALGÚN recurso

Si no te importa qué recurso específico, solo que tenga acceso a algo:

```typescript
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(new TokenValidateMiddleware({
        jwtSecret: process.env.JWT_SECRET,
        // Sin requiredResource - solo valida que tenga algún recurso
      }).use.bind(new TokenValidateMiddleware({
        jwtSecret: process.env.JWT_SECRET,
      })))
      .forRoutes('*');
  }
}
```

---

### Caso 5: Aplicar validación a nivel de controlador

```typescript
@Controller('market-insights')
@RequireResource('fbc-market-insights') // ✅ Se aplica a todos los métodos
export class MarketInsightsController {
  
  @Get('reports')
  getReports() {
    // Solo necesita tener el recurso
    return { reports: [] };
  }

  @Get('admin')
  @Roles('admin', 'admin_user') // ✅ Además requiere estos roles
  getAdminReports() {
    return { adminReports: [] };
  }

  @Get('view')
  @Roles('admin_view') // ✅ Solo este rol
  getViewReports() {
    return { viewReports: [] };
  }
}
```

---

### Caso 6: Acceder a la información del usuario

```typescript
@Controller('profile')
export class ProfileController {
  @Get('me')
  @RequireResource('fbc-market-insights')
  getMyProfile(@Request() req) {
    const user = req.user;
    
    return {
      email: user.email,
      nombre: user.name,
      
      // Roles en market insights
      marketInsightsRoles: user.resource_access['fbc-market-insights']?.roles || [],
      
      // Roles globales
      realmRoles: user.realm_access?.roles || [],
      
      // Grupos
      grupos: user.groups || [],
      
      // Todos los recursos a los que tiene acceso
      todosLosRecursos: Object.keys(user.resource_access || {}),
    };
  }
}
```

---

## 🔐 Configuración con Variables de Entorno

```typescript
// .env
JWT_SECRET=tu-secreto-de-keycloak
REQUIRED_RESOURCE=fbc-market-insights

// app.module.ts
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TokenValidateModule.forRoot({
      jwtSecret: process.env.JWT_SECRET,
      requiredResource: process.env.REQUIRED_RESOURCE,
    }),
  ],
})
export class AppModule {}
```

---

## 📋 Tabla de Validación

| Configuración | Valida |
|--------------|---------|
| Sin `requiredResource` | Al menos un recurso en `resource_access` |
| `requiredResource: 'fbc-pom'` | Debe tener acceso a `fbc-pom` |
| `requiredResource + requiredRoles` | Recurso + roles específicos en ese recurso |
| `@RequireResource('recurso')` | Igual que middleware pero a nivel endpoint |
| `@Roles('admin')` sin @RequireResource | Busca el rol en `realm_access.roles` |

---

## ⚠️ Mensajes de Error

| Error | Significado |
|-------|-------------|
| `Token no proporcionado` | Falta el header `Authorization` |
| `Token inválido` | Token mal formado o firma incorrecta |
| `Token expirado` | El token ya no es válido |
| `El token no contiene acceso a recursos válidos` | Sin `resource_access` ni `realm_access` |
| `No tienes acceso al recurso: fbc-pom` | No tiene ese recurso en `resource_access` |
| `No tienes los roles necesarios en el recurso` | Tiene el recurso pero no los roles requeridos |

---

## 🧪 Testing

Para testing, puedes generar tokens JWT de prueba:

```typescript
import * as jwt from 'jsonwebtoken';

const testToken = jwt.sign({
  sub: 'test-user-id',
  email: 'test@falabella.cl',
  resource_access: {
    'fbc-market-insights': {
      roles: ['admin', 'admin_user']
    }
  },
  realm_access: {
    roles: ['vendor']
  }
}, 'tu-secreto-de-test', { expiresIn: '1h' });

// Usar en tests
const response = await request(app.getHttpServer())
  .get('/market-insights/data')
  .set('Authorization', `Bearer ${testToken}`)
  .expect(200);
```

---

## 🔧 Troubleshooting

### "No tienes acceso al recurso"
- Verifica que el token contenga el recurso en `resource_access`
- Usa `jwt.io` para decodificar el token y verificar su contenido

### "Token inválido"
- Verifica que el `JWT_SECRET` sea correcto
- En Keycloak, el secret está en: Realm Settings > Keys > RS256 Public Key

### Middleware no se ejecuta
- Verifica que estés usando `.bind()` en el middleware
- Asegúrate de que las rutas coincidan con el patrón especificado
