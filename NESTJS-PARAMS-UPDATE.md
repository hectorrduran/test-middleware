# Actualización: Parámetros Personalizados en NestJS

## ✅ Cambios Implementados

### 1. **Guards de NestJS Actualizados** 

Se actualizaron `DecodeGuard` y `RolesGuard` en `src/adapters/nestjs-guard.ts` para soportar las nuevas opciones de parámetros personalizados.

**Cambios realizados**:
- ✅ Los guards ahora leen las opciones completas del metadata del decorador
- ✅ Soporte para `paramName` y `paramSource` personalizados
- ✅ Llamada correcta a `extractTaxId(request, paramName, paramSource)`
- ✅ Mensajes de error dinámicos que muestran el parámetro esperado

**Código actualizado**:
```typescript
// Antes
if (validateTaxIdFlag) {
  const taxIdFromRequest = extractTaxId(request);
  if (!taxIdFromRequest) {
    throw new ForbiddenException('tax_id no proporcionado en la solicitud');
  }
}

// Después
if (validateTaxIdFlag) {
  const taxIdOptions: {
    paramName?: string;
    paramSource?: 'path' | 'query' | 'body' | 'header';
    bypassRoles?: string[];
    resource?: string;
  } = typeof validateTaxIdFlag === 'object' ? validateTaxIdFlag : {};
  
  const taxIdFromRequest = extractTaxId(
    request,
    taxIdOptions.paramName,
    taxIdOptions.paramSource
  );
  
  if (!taxIdFromRequest) {
    const paramInfo = taxIdOptions.paramName 
      ? `'${taxIdOptions.paramName}'${taxIdOptions.paramSource ? ` en ${taxIdOptions.paramSource}` : ''}`
      : 'tax_id';
    throw new ForbiddenException(`Parámetro ${paramInfo} no proporcionado en la solicitud`);
  }

  const taxIdResult = validateTaxId(decoded, taxIdFromRequest, {
    bypassRoles: taxIdOptions.bypassRoles || this.validationOptions.taxIdBypassRoles,
    resource: taxIdOptions.resource || requiredResource,
    paramName: taxIdOptions.paramName,
    paramSource: taxIdOptions.paramSource
  });
}
```

---

### 2. **Nuevo Controlador de Ejemplos**

Creado `vendors.controller.ts` con 8 ejemplos completos que demuestran todos los casos de uso:

**Ejemplos incluidos**:
1. ✅ Parámetro por defecto `tax_id` en path
2. ✅ Parámetro `rut` en path
3. ✅ Parámetro `companyId` en query string
4. ✅ Parámetro `tax_id` en body
5. ✅ Parámetro `x-company-id` en headers
6. ✅ Búsqueda flexible sin especificar fuente
7. ✅ Combinación con roles y bypass
8. ✅ Body con estructura compleja

**Archivo**: `example-middleware-token-validate/nestjs-app/src/controllers/vendors.controller.ts`

---

### 3. **Documentación Completa**

Creado `TAX-ID-PARAMS-NESTJS.md` con:
- ✅ Guía completa de uso del decorador `@ValidateTaxId()`
- ✅ 7 ejemplos prácticos con código y solicitudes curl
- ✅ Mejores prácticas
- ✅ Solución de problemas comunes
- ✅ Comparación con Express

**Archivo**: `example-middleware-token-validate/nestjs-app/TAX-ID-PARAMS-NESTJS.md`

---

### 4. **Módulo Actualizado**

El `app.module.ts` ahora incluye el nuevo `VendorsController` para que los ejemplos estén disponibles.

---

## 📋 Estado del Proyecto

### ✅ Completado

| Framework | Funcionalidad | Estado |
|-----------|--------------|--------|
| **Core** | `extractTaxId()` mejorado | ✅ |
| **Core** | Tipos extendidos | ✅ |
| **Express** | Middleware actualizado | ✅ |
| **Express** | 7 ejemplos funcionando | ✅ |
| **Express** | Documentación (TAX-ID-PARAMS.md) | ✅ |
| **NestJS** | Decorador actualizado | ✅ |
| **NestJS** | Guards actualizados | ✅ |
| **NestJS** | 8 ejemplos creados | ✅ |
| **NestJS** | Documentación (TAX-ID-PARAMS-NESTJS.md) | ✅ |
| **Compilación** | Sin errores | ✅ |

---

## 🎯 Uso en NestJS

### Sintaxis Básica

```typescript
import { ValidateTaxId } from '@falabella/middleware-token-validate';

@Controller('vendors')
export class VendorsController {
  
  // Ejemplo 1: Parámetro 'rut' en path
  @Get(':rut/orders')
  @ValidateTaxId({
    paramName: 'rut',
    paramSource: 'path'
  })
  getOrders(@Param('rut') rut: string) {
    return { rut };
  }

  // Ejemplo 2: Parámetro 'companyId' en query
  @Get('reports')
  @ValidateTaxId({
    paramName: 'companyId',
    paramSource: 'query'
  })
  getReports(@Query('companyId') companyId: string) {
    return { companyId };
  }

  // Ejemplo 3: Parámetro en header
  @Post('analytics')
  @ValidateTaxId({
    paramName: 'x-company-id',
    paramSource: 'header'
  })
  getAnalytics(@Headers('x-company-id') companyId: string) {
    return { companyId };
  }
}
```

---

## 🔧 Configuración Completa

El decorador `@ValidateTaxId()` acepta las siguientes opciones:

```typescript
interface ValidateTaxIdOptions {
  // Nombre del parámetro a buscar (ej: 'rut', 'companyId', 'vendorId')
  paramName?: string;
  
  // Fuente específica donde buscar el parámetro
  paramSource?: 'path' | 'query' | 'body' | 'header';
  
  // Roles que pueden saltarse la validación de tax_id
  bypassRoles?: string[];
  
  // Recurso para evaluar los bypass roles
  resource?: string;
}
```

---

## 🚀 Cómo Probar

### 1. **Iniciar la aplicación NestJS**

```bash
cd example-middleware-token-validate/nestjs-app
npm install
npm run start:dev
```

### 2. **Probar los endpoints**

```bash
# Ejemplo con 'rut' en path
curl -X GET http://localhost:3000/vendors/96756430/orders \
  -H "Authorization: Bearer YOUR_TOKEN"

# Ejemplo con 'companyId' en query
curl -X GET "http://localhost:3000/vendors/reports?companyId=96756430" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Ejemplo con header personalizado
curl -X POST http://localhost:3000/vendors/analytics \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Company-Id: 96756430" \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2024-01-01"}'
```

### 3. **Revisar la documentación**

- **NestJS**: `example-middleware-token-validate/nestjs-app/TAX-ID-PARAMS-NESTJS.md`
- **Express**: `example-middleware-token-validate/express-app/TAX-ID-PARAMS.md`

---

## 📝 Notas Importantes

### Diferencias entre DecodeGuard y RolesGuard

Ambos guards ahora soportan parámetros personalizados:

- **DecodeGuard**: Solo decodifica el token (no valida firma)
  - Usado cuando `decodeOnly: true`
  - Más rápido, útil cuando API Gateway ya validó el token

- **RolesGuard**: Valida el token completo incluyendo firma
  - Usado cuando `decodeOnly: false`
  - Validación completa JWT

### Búsqueda de Parámetros

El orden de búsqueda cuando **NO** se especifica `paramSource`:

1. **params** (path parameters)
2. **query** (query string)
3. **body** (request body)
4. **headers**

### Case Sensitivity

- **Headers**: No son case-sensitive (`X-Company-Id` = `x-company-id`)
- **Otros**: Case-sensitive (`taxId` ≠ `taxid`)

---

## 🐛 Problemas Resueltos

### Problema 1: Guards no leían las opciones del decorador

**Antes**: Los guards trataban `validateTaxIdFlag` como boolean
```typescript
if (validateTaxIdFlag) {
  const taxIdFromRequest = extractTaxId(request);  // Sin parámetros
}
```

**Después**: Ahora lee el objeto de opciones
```typescript
if (validateTaxIdFlag) {
  const taxIdOptions = typeof validateTaxIdFlag === 'object' ? validateTaxIdFlag : {};
  const taxIdFromRequest = extractTaxId(request, taxIdOptions.paramName, taxIdOptions.paramSource);
}
```

### Problema 2: Errores TypeScript en los guards

**Solución**: Añadida tipificación explícita para `taxIdOptions`:
```typescript
const taxIdOptions: {
  paramName?: string;
  paramSource?: 'path' | 'query' | 'body' | 'header';
  bypassRoles?: string[];
  resource?: string;
} = typeof validateTaxIdFlag === 'object' ? validateTaxIdFlag : {};
```

---

## ✨ Ventajas de esta Implementación

1. **Flexibilidad**: Soporta cualquier nombre de parámetro
2. **Múltiples fuentes**: Path, query, body, headers
3. **Framework-agnostic**: Core funciona en Express y NestJS
4. **Backward compatible**: Funciona sin opciones (comportamiento por defecto)
5. **Type-safe**: TypeScript con tipado completo
6. **Mensajes claros**: Errores descriptivos sobre qué parámetro faltó

---

## 📚 Recursos

- **Controlador de ejemplo**: `example-middleware-token-validate/nestjs-app/src/controllers/vendors.controller.ts`
- **Documentación NestJS**: `example-middleware-token-validate/nestjs-app/TAX-ID-PARAMS-NESTJS.md`
- **Documentación Express**: `example-middleware-token-validate/express-app/TAX-ID-PARAMS.md`
- **Guards actualizados**: `src/adapters/nestjs-guard.ts`
- **Decoradores**: `src/adapters/nestjs-decorators.ts`

---

## 🎉 Resumen

La funcionalidad de **parámetros personalizados** está ahora **completamente implementada** en NestJS:

✅ **Guards actualizados** (DecodeGuard y RolesGuard)  
✅ **8 ejemplos funcionales** en VendorsController  
✅ **Documentación completa** con casos de uso  
✅ **Compilación exitosa** sin errores  
✅ **Paridad con Express** (mismas capacidades en ambos frameworks)

**Respuesta a tu pregunta**: En NestJS, pasas el nombre del parámetro y dónde buscarlo usando el decorador `@ValidateTaxId()`:

```typescript
@ValidateTaxId({
  paramName: 'rut',       // ← Aquí defines el nombre
  paramSource: 'path'     // ← Aquí defines dónde buscarlo
})
```

Las opciones disponibles para `paramSource` son:
- `'path'` - Parámetros de ruta (`:rut`, `:id`)
- `'query'` - Query string (`?companyId=123`)
- `'body'` - Cuerpo de la petición (JSON)
- `'header'` - Headers HTTP
