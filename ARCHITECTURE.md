# Arquitectura v2.0

## 📐 Diagrama de Capas

```
┌─────────────────────────────────────────────────────────────┐
│                    APLICACIONES                              │
│  (NestJS Apps, Express Apps, Lambda Functions, etc.)        │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
┌────────▼────────┐    ┌────────▼────────┐
│  NestJS Adapter │    │ Express Adapter │
│                 │    │                 │
│ - Middleware    │    │ - Middlewares   │
│ - Guard         │    │ - Functions     │
│ - Decorators    │    │                 │
│ - Module        │    │                 │
└────────┬────────┘    └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │
         ┌───────────▼───────────┐
         │    CORE (Pure JS)     │
         │                       │
         │ - Token Validator     │
         │ - Role Validator      │
         │ - Tax ID Validator    │
         │ - Types               │
         │ - Role Aliases        │
         └───────────┬───────────┘
                     │
         ┌───────────▼───────────┐
         │   jsonwebtoken (JWT)  │
         └───────────────────────┘
```

## 🔄 Flujo de Validación

### Express Flow
```
HTTP Request
    │
    ▼
┌─────────────────────┐
│ createTokenMiddleware│
│   (Express Adapter) │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  validateToken()    │
│   (Core Function)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ jwt.verify()        │
│   (jsonwebtoken)    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Decoded Token       │
│ → req.user          │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Next Middleware     │
└─────────────────────┘
```

### NestJS Flow
```
HTTP Request
    │
    ▼
┌─────────────────────┐
│   RolesGuard        │
│  (NestJS Adapter)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  validateToken()    │
│   (Core Function)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  validateRoles()    │
│   (Core Function)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Controller Handler  │
└─────────────────────┘
```

## 📦 Estructura de Módulos

```
@falabella/middleware-token-validate
│
├── 📁 core/                     (Pure TypeScript, no frameworks)
│   ├── types.ts                 (Shared interfaces)
│   ├── token-validator.ts       (JWT validation logic)
│   ├── role-validator.ts        (Role checking logic)
│   ├── tax-id-validator.ts      (Tax ID validation logic)
│   ├── role-aliases.ts          (Role alias mappings)
│   └── index.ts                 (Core exports)
│
├── 📁 adapters/                 (Framework-specific wrappers)
│   │
│   ├── 📁 nestjs/               (NestJS integration)
│   │   ├── nestjs-middleware.ts (Middleware class)
│   │   ├── nestjs-guard.ts      (Guard class)
│   │   ├── nestjs-decorators.ts (Decorators)
│   │   ├── nestjs-module.ts     (Dynamic module)
│   │   └── nestjs.ts            (NestJS exports)
│   │
│   └── express.ts               (Express integration)
│       └── (Middleware functions)
│
└── index.ts                     (Main entry point)
```

## 🎯 Principios de Diseño

### 1. Separation of Concerns
```
Core Logic ─────► Framework Adapters ─────► Application
(Pure TS)         (NestJS/Express)         (Your Code)
```

### 2. Dependency Injection
```
Core: NO dependencies on frameworks
  │
  ├─► NestJS Adapter: Uses @nestjs/* only here
  │
  └─► Express Adapter: Uses express types only here
```

### 3. Single Responsibility
```
Core Functions:
├── validateToken()     → Token verification only
├── validateRoles()     → Role checking only
├── validateTaxId()     → Tax ID checking only
└── extractToken()      → Token extraction only

Adapters:
├── NestJS → Wraps core with NestJS decorators
└── Express → Wraps core with Express middleware pattern
```

## 🔌 Interfaces

### Core Types
```typescript
interface ValidationOptions {
  jwtSecret?: string;
  publicKey?: string;
  skipVerification?: boolean;
  issuer?: string;
  audience?: string | string[];
  requiredResource?: string;
  requiredRoles?: string[];
  validateRealmRoles?: boolean;
  taxIdBypassRoles?: string[];
}

interface ValidationResult {
  success: boolean;
  decoded?: DecodedToken;
  error?: {
    code: string;
    message: string;
    statusCode: number;
  };
}
```

### Express Middleware Signature
```typescript
type Middleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => void;
```

### NestJS Guard Signature
```typescript
class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean;
}
```

## 🧪 Testing Strategy

```
┌─────────────────────────────────────┐
│         Unit Tests (Core)           │
│  - Test pure functions              │
│  - No framework dependencies        │
│  - Fast, isolated tests             │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│    Integration Tests (Adapters)     │
│  - Test with framework mocks        │
│  - Verify adapter behavior          │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│      E2E Tests (Applications)       │
│  - Test full request/response       │
│  - Real JWT tokens                  │
└─────────────────────────────────────┘
```

## 📊 Performance

```
Request Processing Time:
┌──────────────────────────────────────┐
│ Express Adapter: ~1-2ms overhead     │
│ NestJS Adapter:  ~2-3ms overhead     │
│ Core Logic:      ~0.5ms              │
│ JWT Verify:      ~2-5ms              │
│ ────────────────────────────────────│
│ Total:           ~4-10ms             │
└──────────────────────────────────────┘
```

## 🔒 Security Layers

```
┌─────────────────────────────────────┐
│  1. Token Extraction & Validation   │
│     - Bearer token format           │
│     - JWT signature verification    │
│     - Expiration check              │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│  2. Resource Access Validation      │
│     - resource_access check         │
│     - realm_access fallback         │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│  3. Role Validation (Optional)      │
│     - Required roles check          │
│     - Role aliases resolution       │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│  4. Tax ID Validation (Optional)    │
│     - Tax ID matching               │
│     - Bypass roles check            │
└─────────────────────────────────────┘
```

## 🚀 Extension Points

### Adding New Frameworks

```typescript
// 1. Create new adapter file
src/adapters/fastify.ts

// 2. Import core functions
import { validateToken, ValidationOptions } from '../core';

// 3. Create framework-specific wrapper
export function createFastifyTokenHook(options: ValidationOptions) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const result = validateToken(request.headers.authorization, options);
    if (!result.success) {
      reply.code(401).send({ error: result.error?.message });
      return;
    }
    request.user = result.decoded;
  };
}

// 4. Export from index.ts
export * from './adapters/fastify';
```

### Adding New Validation Logic

```typescript
// 1. Add to core
src/core/new-validator.ts

export function validateSomething(decoded: DecodedToken): ValidationResult {
  // Pure validation logic
}

// 2. Use in adapters
import { validateSomething } from '../core';
```

## 📈 Scalability

```
Single Project
├── Install: 1 package
├── Size: ~50KB (core + 1 adapter)
└── Dependencies: minimal

Multiple Projects
├── Install: Same 1 package
├── Reuse: Core + different adapters
└── Consistency: Same validation logic everywhere
```
