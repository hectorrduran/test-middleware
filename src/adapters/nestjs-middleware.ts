/**
 * Adaptador de NestJS - Usa el core puro
 */

import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ValidationOptions, validateToken, decodeAndValidatePermissions } from '../core';

/**
 * Middleware de NestJS que solo decodifica el token sin validar la firma
 * Útil cuando la validación JWT ya fue realizada por una capa anterior
 */
@Injectable()
export class TokenDecodeMiddleware implements NestMiddleware {
  private options: ValidationOptions;

  constructor(options: ValidationOptions = {}) {
    this.options = options;
  }

  use(req: Request, res: Response, next: NextFunction) {
    const result = decodeAndValidatePermissions(req.headers.authorization, this.options);

    if (!result.success) {
      throw new UnauthorizedException(result.error?.message || 'No autorizado');
    }

    // Adjuntar usuario decodificado al request
    (req as any).user = result.decoded;
    next();
  }
}

/**
 * Middleware de NestJS que valida el token JWT (incluye validación de firma)
 */
@Injectable()
export class TokenValidateMiddleware implements NestMiddleware {
  private options: ValidationOptions;

  constructor(options: ValidationOptions) {
    this.options = options;
  }

  use(req: Request, res: Response, next: NextFunction) {
    const result = validateToken(req.headers.authorization, this.options);

    if (!result.success) {
      throw new UnauthorizedException(result.error?.message || 'No autorizado');
    }

    // Adjuntar usuario decodificado al request
    (req as any).user = result.decoded;
    next();
  }
}
