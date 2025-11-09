# 🎉 Librería Middleware Token Validate - Resumen

## ✅ Proyecto Completado

Se ha creado exitosamente una librería NestJS para validar tokens JWT de Keycloak con soporte para `resource_access`.

## 📁 Estructura del Proyecto

```
Middleware-token-validate/
├── src/
│   ├── decorators/
│   │   └── roles.decorator.ts           # @Roles y @RequireResource
│   ├── guards/
│   │   └── roles.guard.ts               # RolesGuard para validación
│   ├── interfaces/
│   │   └── token-validate-options.interface.ts
│   ├── middleware/
│   │   └── token-validate.middleware.ts # Middleware principal
│   ├── token-validate.module.ts         # Módulo dinámico
│   └── index.ts                         # Exportaciones
├── example/
│   ├── app.module.ts                    # Ejemplo de configuración
│   ├── market-insights.controller.ts    # Ejemplo de controladores
│   └── EXAMPLES.md                      # Más ejemplos
├── dist/                                # Archivos compilados
├── README.md                            # Documentación principal
├── USAGE-GUIDE.md                       # Guía de uso detallada
├── package.json
└── tsconfig.json
```

## 🎯 Funcionalidades Principales

### 1. Validación de Resource Access
- ✅ Valida que el token tenga acceso a recursos específicos en `resource_access`
- ✅ Ejemplo: `resource_access['fbc-market-insights']`

### 2. Validación de Roles por Recurso
- ✅ Valida roles específicos dentro de cada recurso
- ✅ Ejemplo: `resource_access['fbc-market-insights'].roles` incluye `'admin'`

### 3. Decoradores Flexibles
- ✅ `@RequireResource('recurso')`: Requiere acceso al recurso
- ✅ `@Roles('rol1', 'rol2')`: Requiere al menos uno de los roles

### 4. Middleware Configurable
- ✅ Se puede aplicar globalmente o por rutas específicas
- ✅ Configurable por recurso y roles

### 5. Soporte para Realm Roles
- ✅ También valida roles en `realm_access.roles` cuando se usa solo `@Roles()`

## 🚀 Uso Rápido

### Instalación
```bash
npm install @falabella/middleware-token-validate
npm install @nestjs/common @nestjs/core jsonwebtoken reflect-metadata rxjs
```

### Configuración Básica
```typescript
import { TokenValidateMiddleware } from '@falabella/middleware-token-validate';

export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(new TokenValidateMiddleware({
        jwtSecret: process.env.JWT_SECRET,
        requiredResource: 'fbc-market-insights',
      }).use.bind(new TokenValidateMiddleware({
        jwtSecret: process.env.JWT_SECRET,
        requiredResource: 'fbc-market-insights',
      })))
      .forRoutes('*');
  }
}
```

### Uso en Controladores
```typescript
import { RequireResource, Roles } from '@falabella/middleware-token-validate';

@Controller('data')
export class DataController {
  @Get('public')
  @RequireResource('fbc-market-insights')
  getPublicData() {
    return { data: 'público' };
  }

  @Get('admin')
  @RequireResource('fbc-market-insights')
  @Roles('admin', 'admin_user')
  getAdminData() {
    return { data: 'privado' };
  }
}
```

## 📦 Compilación y Distribución

### Compilar
```bash
npm run build
```

### Publicar
```bash
npm publish
```

## 📖 Documentación

- **README.md**: Documentación completa con todos los ejemplos
- **USAGE-GUIDE.md**: Guía específica para tokens de Keycloak/Falabella
- **example/EXAMPLES.md**: Ejemplos adicionales de casos de uso

## 🔑 Ejemplo de Token Soportado

```json
{
  "sub": "user-id",
  "email": "user@falabella.cl",
  "resource_access": {
    "fbc-market-insights": {
      "roles": ["admin", "admin_user", "admin_view"]
    },
    "cost-management": {
      "roles": ["document-admin", "view-document"]
    }
  },
  "realm_access": {
    "roles": ["vendor", "offline_access"]
  }
}
```

## ✨ Características Destacadas

1. **Validación Automática**: Rechaza automáticamente requests sin roles
2. **Múltiples Recursos**: Soporta validación de diferentes recursos por ruta
3. **TypeScript**: Completamente tipado con definiciones TypeScript
4. **Flexible**: Se puede usar como middleware o guard
5. **Compatible**: Diseñado específicamente para tokens de Keycloak

## 🧪 Testing

Para compilar y probar:
```bash
cd "/Users/hectorduran/Documents/Falabella Project/POM CORP/GCP/Lib/Middleware-token-validate"
npm install
npm run build
```

## 📝 Próximos Pasos

1. **Publicar en npm**: `npm publish` (configurar registro privado si es necesario)
2. **Instalar en proyecto**: `npm install @falabella/middleware-token-validate`
3. **Configurar JWT_SECRET**: Obtener de Keycloak
4. **Implementar en controladores**: Usar decoradores según necesidad

## 🎓 Ejemplo Completo de Integración

```typescript
// 1. Instalar
npm install @falabella/middleware-token-validate

// 2. Configurar en app.module.ts
import { TokenValidateMiddleware } from '@falabella/middleware-token-validate';

export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(new TokenValidateMiddleware({
        jwtSecret: 'tu-secreto-keycloak',
        requiredResource: 'fbc-market-insights',
      }).use.bind(new TokenValidateMiddleware({
        jwtSecret: 'tu-secreto-keycloak',
        requiredResource: 'fbc-market-insights',
      })))
      .forRoutes('*');
  }
}

// 3. Usar en controladores
@Controller('market-insights')
export class MarketInsightsController {
  @Get('reports')
  @RequireResource('fbc-market-insights')
  getReports() {
    return { reports: [] };
  }

  @Get('admin')
  @RequireResource('fbc-market-insights')
  @Roles('admin', 'admin_user')
  getAdminReports() {
    return { adminReports: [] };
  }
}

// 4. Hacer requests con token
GET /market-insights/reports
Headers: {
  "Authorization": "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## ✅ Todo Listo!

La librería está completamente funcional y lista para usar. Consulta los archivos de documentación para más detalles.
