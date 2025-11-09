/**
 * @falabella/middleware-token-validate
 * 
 * Librería framework-agnostic para validar tokens JWT y roles
 * Compatible con NestJS, Express y cualquier framework Node.js
 */

// ============================================
// CORE (Sin dependencias de frameworks)
// ============================================
export * from './core';

// ============================================
// ADAPTADORES PARA NESTJS
// ============================================
export * from './adapters/nestjs';

// ============================================
// ADAPTADORES PARA EXPRESS
// ============================================
export * from './adapters/express';

// ============================================
// LEGACY EXPORTS (Para retrocompatibilidad)
// ============================================
// Re-exportar con nombres antiguos para no romper código existente
export { TokenValidateMiddleware } from './adapters/nestjs-middleware';
export { RolesGuard } from './adapters/nestjs-guard';
export { TokenValidateModule } from './adapters/nestjs-module';
export * from './adapters/nestjs-decorators';

