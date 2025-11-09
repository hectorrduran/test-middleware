/**
 * Guard de NestJS para validar roles - Usa el core puro
 */

import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException, Inject, Optional } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { 
  validateToken,
  decodeAndValidatePermissions,
  validateRoles, 
  validateTaxId,
  extractTaxId,
  DecodedToken,
  ValidationOptions
} from '../core';
import { ROLES_KEY, RESOURCE_KEY, VALIDATE_TAX_ID_KEY, REALM_ROLES_KEY, USE_ALIASES_KEY } from './nestjs-decorators';

/**
 * Guard que solo decodifica el token sin validar la firma
 * Útil cuando la validación JWT ya fue realizada por una capa anterior
 */
@Injectable()
export class DecodeGuard implements CanActivate {
  private validationOptions: ValidationOptions;

  constructor(@Optional() @Inject('TOKEN_VALIDATE_OPTIONS') options?: ValidationOptions) {
    this.validationOptions = options || {};
  }

  private getReflector(context: ExecutionContext): Reflector {
    // Obtener el Reflector desde el contexto de la aplicación
    const app = context.switchToHttp().getNext();
    return new Reflector();
  }

  canActivate(context: ExecutionContext): boolean {
    const reflector = this.getReflector(context);
    
    const requiredRoles = reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredResource = reflector.getAllAndOverride<string>(RESOURCE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const validateTaxIdFlag = reflector.getAllAndOverride<boolean>(VALIDATE_TAX_ID_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredRealmRoles = reflector.getAllAndOverride<string[]>(REALM_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const useAliases = reflector.getAllAndOverride<boolean>(USE_ALIASES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    // Solo decodificar token (sin validar firma)
    const tokenResult = decodeAndValidatePermissions(authHeader, this.validationOptions);
    if (!tokenResult.success || !tokenResult.decoded) {
      throw new UnauthorizedException(tokenResult.error?.message || 'No autorizado');
    }

    const decoded = tokenResult.decoded;
    request.user = decoded;

    // Validar roles de realm
    if (requiredRealmRoles && requiredRealmRoles.length > 0) {
      const rolesResult = validateRoles(decoded, {
        requiredRealmRoles,
        useAliases
      });

      if (!rolesResult.success) {
        throw new ForbiddenException(rolesResult.error?.message || 'Acceso denegado');
      }

      // Si tiene los roles de realm, permitir acceso (bypass de resource y taxId)
      return true;
    }

    // Validar roles de recurso
    if (requiredResource && requiredRoles && requiredRoles.length > 0) {
      const rolesResult = validateRoles(decoded, {
        requiredRoles,
        requiredResource,
        useAliases
      });

      if (!rolesResult.success) {
        throw new ForbiddenException(rolesResult.error?.message || 'Acceso denegado');
      }
    }

    // Validar Tax ID si está habilitado
    if (validateTaxIdFlag) {
      // Si validateTaxIdFlag es un objeto, contiene las opciones
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

      if (!taxIdResult.success) {
        throw new ForbiddenException(taxIdResult.error?.message || 'Acceso denegado');
      }
    }

    return true;
  }
}

/**
 * Guard que valida el token JWT completo (incluye validación de firma)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private validationOptions: ValidationOptions;

  constructor(@Optional() @Inject('TOKEN_VALIDATE_OPTIONS') options?: ValidationOptions) {
    this.validationOptions = options || {};
  }

  private getReflector(context: ExecutionContext): Reflector {
    return new Reflector();
  }

  canActivate(context: ExecutionContext): boolean {
    const reflector = this.getReflector(context);
    
    const requiredRoles = reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredResource = reflector.getAllAndOverride<string>(RESOURCE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const validateTaxIdFlag = reflector.getAllAndOverride<boolean>(VALIDATE_TAX_ID_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredRealmRoles = reflector.getAllAndOverride<string[]>(REALM_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const useAliases = reflector.getAllAndOverride<boolean>(USE_ALIASES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    // Validar token
    const tokenResult = validateToken(authHeader, this.validationOptions);
    if (!tokenResult.success || !tokenResult.decoded) {
      throw new UnauthorizedException(tokenResult.error?.message || 'No autorizado');
    }

    const decoded = tokenResult.decoded;
    request.user = decoded;

    // Validar roles de realm
    if (requiredRealmRoles && requiredRealmRoles.length > 0) {
      const rolesResult = validateRoles(decoded, {
        requiredRealmRoles,
        useAliases
      });

      if (!rolesResult.success) {
        throw new ForbiddenException(rolesResult.error?.message || 'Acceso denegado');
      }

      // Si tiene los roles de realm, permitir acceso (bypass de resource y taxId)
      return true;
    }

    // Validar roles de recurso
    if (requiredResource && requiredRoles && requiredRoles.length > 0) {
      const rolesResult = validateRoles(decoded, {
        requiredRoles,
        requiredResource,
        useAliases
      });

      if (!rolesResult.success) {
        throw new ForbiddenException(rolesResult.error?.message || 'Acceso denegado');
      }
    }

    // Validar Tax ID si está habilitado
    if (validateTaxIdFlag) {
      // Si validateTaxIdFlag es un objeto, contiene las opciones
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

      if (!taxIdResult.success) {
        throw new ForbiddenException(taxIdResult.error?.message || 'Acceso denegado');
      }
    }

    return true;
  }
}
