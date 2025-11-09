/**
 * Módulo de NestJS - Usa el core puro
 */

import { Module, DynamicModule, Global } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ValidationOptions } from '../core';
import { RolesGuard, DecodeGuard } from './nestjs-guard';

export interface TokenModuleOptions extends ValidationOptions {
  /**
   * Si es true, solo decodifica el token sin validar la firma JWT
   * Útil cuando la validación ya fue realizada por una capa anterior (API Gateway, Cloud Endpoints, etc.)
   * @default false
   */
  decodeOnly?: boolean;
}

@Global()
@Module({})
export class TokenValidateModule {
  static forRoot(options: TokenModuleOptions): DynamicModule {
    const GuardToUse = options.decodeOnly ? DecodeGuard : RolesGuard;
    
    console.log(`🔧 TokenValidateModule configurado con decodeOnly=${options.decodeOnly}`);
    console.log(`🛡️  Guard seleccionado: ${GuardToUse.name}`);
    
    return {
      module: TokenValidateModule,
      providers: [
        {
          provide: 'TOKEN_VALIDATE_OPTIONS',
          useValue: options,
        },
        {
          provide: APP_GUARD,
          useClass: GuardToUse,
        },
      ],
      exports: ['TOKEN_VALIDATE_OPTIONS'],
    };
  }
}

