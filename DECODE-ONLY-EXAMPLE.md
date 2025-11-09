# Ejemplo Rápido - Modo Decode Only

## Caso de Uso: Cloud Endpoints + NestJS

Tu aplicación está desplegada en **Google Cloud Run** detrás de **Cloud Endpoints** que valida los tokens JWT.

### Arquitectura

```
Cliente
   │
   ├─ JWT Token
   │
   ▼
Cloud Endpoints  ◄── Valida firma JWT aquí
   │                  - Issuer: https://accounts.google.com
   ├─ Token válido    - Audience: your-client-id
   │                  - Expiración
   ▼                  - Firma válida
Cloud Run (NestJS) ◄── Solo decodifica y valida permisos
   │                  - Roles
   └─ Respuesta       - Recursos
                      - Tax ID
```

### openapi.yaml (Cloud Endpoints)

```yaml
swagger: "2.0"
info:
  title: "My API"
  version: "1.0.0"
host: "my-api.endpoints.my-project.cloud.goog"
schemes:
  - "https"
securityDefinitions:
  firebase:
    authorizationUrl: ""
    flow: "implicit"
    type: "oauth2"
    x-google-issuer: "https://securetoken.google.com/my-project"
    x-google-jwks_uri: "https://www.googleapis.com/service_accounts/v1/metadata/x509/securetoken@system.gserviceaccount.com"
    x-google-audiences: "my-project"
security:
  - firebase: []
paths:
  /api/companies:
    get:
      operationId: "getCompanies"
      security:
        - firebase: []
      responses:
        200:
          description: "Success"
```

### app.module.ts

```typescript
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TokenValidateModule, RolesGuard } from '@falabella/middleware-token-validate';
import { CompaniesController } from './companies.controller';

@Module({
  imports: [
    TokenValidateModule.forRoot({
      decodeOnly: true,  // 🔑 Cloud Endpoints ya validó el token
      taxIdBypassRoles: ['admin', 'superadmin'],
    }),
  ],
  controllers: [CompaniesController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
```

### companies.controller.ts

```typescript
import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { 
  RolesGuard,
  RealmRoles,
  Roles,
  RequireResource,
  ValidateTaxId,
  UseRoleAliases,
  User
} from '@falabella/middleware-token-validate';

@Controller('api/companies')
@UseGuards(RolesGuard)
export class CompaniesController {
  
  // Solo admins pueden listar todas las empresas
  @Get()
  @RealmRoles('admin')
  async getAllCompanies(@User() user: any) {
    return {
      total: 100,
      companies: [
        { tax_id: '12345678-9', name: 'Company A' },
        { tax_id: '98765432-1', name: 'Company B' },
      ]
    };
  }

  // Cualquiera puede ver su propia empresa (con validación de tax_id)
  @Get(':tax_id')
  @RequireResource('companies-api')
  @Roles('company-viewer', 'company-admin')
  @ValidateTaxId()
  async getCompany(@Param('tax_id') taxId: string, @User() user: any) {
    return {
      tax_id: taxId,
      name: 'Company Name',
      address: '123 Main St',
      email: 'contact@company.com'
    };
  }

  // Solo admins o owners pueden crear empresas
  @Post()
  @RequireResource('companies-api')
  @Roles('company-admin', 'company-owner')
  @UseRoleAliases()
  async createCompany(@Body() body: any, @User() user: any) {
    return {
      success: true,
      tax_id: body.tax_id,
      message: 'Company created successfully'
    };
  }

  // Actualizar empresa con validación de tax_id
  @Put(':tax_id/settings')
  @RequireResource('companies-api')
  @Roles('company-admin', 'company-owner')
  @ValidateTaxId()
  async updateSettings(@Param('tax_id') taxId: string, @Body() body: any, @User() user: any) {
    return {
      success: true,
      tax_id: taxId,
      message: 'Settings updated successfully'
    };
  }

  // Solo admins pueden eliminar empresas
  @Delete(':tax_id')
  @RealmRoles('admin', 'superadmin')
  async deleteCompany(@Param('tax_id') taxId: string, @User() user: any) {
    return {
      success: true,
      message: 'Company deleted successfully'
    };
  }
}
```

### main.ts

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  console.log('🚀 Starting in DECODE-ONLY mode');
  console.log('⚠️  JWT validation is handled by Cloud Endpoints');
  console.log('✅ Only validating roles and permissions');
  
  await app.listen(process.env.PORT || 8080);
}
bootstrap();
```

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 8080

CMD ["node", "dist/main"]
```

### Despliegue

```bash
# Build y push de imagen
gcloud builds submit --tag gcr.io/my-project/my-api

# Deploy a Cloud Run
gcloud run deploy my-api \
  --image gcr.io/my-project/my-api \
  --platform managed \
  --region us-central1 \
  --no-allow-unauthenticated

# Deploy Cloud Endpoints
gcloud endpoints services deploy openapi.yaml
```

### Probar

```bash
# Obtener token (ejemplo con Firebase)
TOKEN=$(gcloud auth print-identity-token)

# Llamar al endpoint (Cloud Endpoints valida el token)
curl -H "Authorization: Bearer $TOKEN" \
  https://my-api.endpoints.my-project.cloud.goog/api/companies
```

## Beneficios de este Enfoque

1. ✅ **Seguridad**: Cloud Endpoints valida la firma JWT
2. ✅ **Performance**: Tu app solo decodifica (5-10x más rápido)
3. ✅ **Escalabilidad**: Cloud Endpoints maneja validación distribuida
4. ✅ **Flexibilidad**: Sigues validando roles/permisos granulares en tu app
5. ✅ **Mantenibilidad**: Cloud Endpoints centraliza la configuración de auth

## Flujo de Request

```
1. Cliente envía request con JWT
   ↓
2. Cloud Endpoints:
   - Valida firma JWT ✓
   - Valida issuer ✓
   - Valida audience ✓
   - Valida expiración ✓
   ↓
3. Si válido, forward a Cloud Run
   ↓
4. Tu NestJS app:
   - Decodifica token (sin validar firma)
   - Extrae claims (roles, recursos, tax_id)
   - Valida roles específicos
   - Valida acceso a recursos
   - Valida tax_id si aplica
   ↓
5. Responde al cliente
```

## Variables de Entorno

```env
# No necesitas estas porque Cloud Endpoints valida
# JWT_SECRET=...
# KEYCLOAK_ISSUER=...
# KEYCLOAK_AUDIENCE=...

# Solo necesitas estas
PORT=8080
NODE_ENV=production
TAX_ID_BYPASS_ROLES=admin,superadmin
```

## Monitoreo

```typescript
import { Logger } from '@nestjs/common';

@Controller('api/companies')
export class CompaniesController {
  private readonly logger = new Logger(CompaniesController.name);

  @Get()
  @RealmRoles('admin')
  async getAllCompanies(@User() user: any) {
    this.logger.log(`Admin ${user.sub} accessing all companies`);
    // ...
  }
}
```

## Testing

```typescript
// companies.controller.spec.ts
import { Test } from '@nestjs/testing';
import { CompaniesController } from './companies.controller';

describe('CompaniesController', () => {
  let controller: CompaniesController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [CompaniesController],
    }).compile();

    controller = module.get(CompaniesController);
  });

  it('should return companies for admin', async () => {
    const mockUser = {
      sub: 'user123',
      realm_access: { roles: ['admin'] }
    };

    const result = await controller.getAllCompanies(mockUser);
    expect(result.total).toBe(100);
  });
});
```

Este ejemplo muestra cómo usar el middleware en modo **decode-only** con Cloud Endpoints validando el JWT y tu app NestJS solo validando roles y permisos específicos. 🚀
