# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-11-08

### 🎉 Major Release: Framework-Agnostic Architecture

### Added
- **Core puro framework-agnostic**: Toda la lógica de validación ahora está en funciones puras sin dependencias de frameworks
- **Soporte oficial para Express**: Nuevos middlewares específicos para Express puro
- **Nuevas funciones del core**:
  - `validateToken()` - Validación completa de token
  - `verifyAndDecodeToken()` - Verificación y decodificación
  - `validateRoles()` - Validación de roles
  - `validateTaxId()` - Validación de Tax ID
  - `extractToken()` - Extracción de token
  - `extractTaxId()` - Extracción de Tax ID
  - `hasRole()`, `hasAnyRole()`, `hasAllRoles()` - Utilidades de roles
- **Nuevos middlewares para Express**:
  - `createTokenMiddleware()` - Validación de tokens
  - `createRolesMiddleware()` - Validación de roles en recursos
  - `createRealmRolesMiddleware()` - Validación de roles de realm
  - `createTaxIdMiddleware()` - Validación de Tax ID
  - `createProtectedMiddleware()` - Middleware combinado
- **Nuevos decoradores para NestJS**:
  - `@RealmRoles()` - Requiere roles en realm_access
  - `@UseRoleAliases()` - Habilita resolución de aliases
- **Nueva estructura de carpetas**:
  - `/src/core` - Lógica pura sin frameworks
  - `/src/adapters` - Adaptadores para frameworks
- **Documentación completa**:
  - `README.md` - README actualizado
  - `EXPRESS-GUIDE.md` - Guía completa de Express
  - `ARCHITECTURE.md` - Arquitectura detallada
  - `MIGRATION-GUIDE.md` - Guía de migración
  - `REFACTORING-SUMMARY.md` - Resumen de cambios

### Changed
- **Dependencias refactorizadas**:
  - `jsonwebtoken` ahora es `dependency` (antes era `peerDependency`)
  - NestJS dependencies son `peerDependencies` **opcionales**
  - Express es `peerDependency` **opcional**
- **Mejor tipado**: Todos los tipos están centralizados en `/src/core/types.ts`
- **Estructura modular**: Separación clara entre core y adaptadores
- **Mejor manejo de errores**: Respuestas de error estandarizadas con códigos y mensajes claros

### Deprecated
- Ninguno (100% retrocompatible)

### Removed
- Ninguno (100% retrocompatible)

### Fixed
- Problemas de dependencias circulares
- Mejor validación de configuración
- Mensajes de error más descriptivos

### Security
- Validación más estricta de tokens
- Mejor manejo de errores sin exponer información sensible

### Breaking Changes
- **Ninguno** - Esta versión es 100% retrocompatible con v1.x

### Migration Notes
- No se requiere migración
- Código v1.x funciona sin cambios
- Ver `MIGRATION-GUIDE.md` para aprovechar nuevas características

---

## [1.0.0] - 2024-XX-XX

### Added
- Validación de tokens JWT para NestJS
- Middleware `TokenValidateMiddleware`
- Guard `RolesGuard`
- Decoradores `@Roles`, `@RequireResource`, `@ValidateTaxId`
- Módulo `TokenValidateModule`
- Validación de `resource_access` y `realm_access`
- Validación de Tax ID
- Sistema de aliases de roles
- Soporte para HS256 y RS256
- Documentación inicial

### Notes
- Primera versión pública
- Solo compatible con NestJS
- Dependencias obligatorias de NestJS

---

## Versioning Strategy

Este proyecto sigue [Semantic Versioning](https://semver.org/):

- **MAJOR** (X.0.0): Cambios incompatibles en la API
- **MINOR** (0.X.0): Nueva funcionalidad compatible hacia atrás
- **PATCH** (0.0.X): Correcciones de bugs compatibles hacia atrás

## Links

- [Repositorio](https://github.com/falabella/middleware-token-validate)
- [Issues](https://github.com/falabella/middleware-token-validate/issues)
- [NPM](https://www.npmjs.com/package/@falabella/middleware-token-validate)
