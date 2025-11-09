/**
 * Punto de entrada específico para NestJS
 * 
 * Para usar con NestJS, importa desde:
 * import { ... } from '@falabella/middleware-token-validate/nestjs'
 */

// Re-exportar el core
export * from './core';

// Exportar adaptadores de NestJS
export * from './adapters/nestjs';

// Legacy exports para retrocompatibilidad
export { TokenValidateMiddleware } from './adapters/nestjs-middleware';
export { RolesGuard, DecodeGuard } from './adapters/nestjs-guard';
export { TokenValidateModule } from './adapters/nestjs-module';
export * from './adapters/nestjs-decorators';
