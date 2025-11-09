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
// ADAPTADORES PARA EXPRESS
// ============================================
export * from './adapters/express';

// ============================================
// NOTA: Para usar con NestJS, importa desde:
// import { ... } from '@falabella/middleware-token-validate/nestjs'
// ============================================

