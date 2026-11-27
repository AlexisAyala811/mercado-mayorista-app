import {
  CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { SessionIdentityReader } from '../application/ports/session-identity-reader.js';
import { SessionTokenService } from '../security/session-token.service.js';
import type { AuthenticatedRequest } from './authenticated-request.js';
import { allowWhilePasswordChangeKey } from './password-change.decorator.js';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly sessions: SessionIdentityReader,
    private readonly tokens: SessionTokenService,
    @Optional() private readonly reflector: Reflector = new Reflector(),
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = extractBearerToken(request.headers.authorization);
    if (!token) throw new UnauthorizedException('Sesión no válida.');

    const identity = await this.sessions.findActiveByTokenHash(
      this.tokens.hash(token),
    );
    if (!identity) throw new UnauthorizedException('Sesión no válida.');

    if (identity.mustChangePassword && !this.allowsPasswordChange(context))
      throw new ForbiddenException({
        code: 'password-change-required',
        message: 'Crea tu contraseña antes de continuar.',
      });

    (request as AuthenticatedRequest).identity = identity;
    return true;
  }

  private allowsPasswordChange(context: ExecutionContext) {
    return (
      this.reflector.getAllAndOverride<boolean>(allowWhilePasswordChangeKey, [
        context.getHandler(),
        context.getClass(),
      ]) === true
    );
  }
}

function extractBearerToken(authorization?: string) {
  if (!authorization) return undefined;
  const [scheme, token, ...rest] = authorization.trim().split(/\s+/);
  if (rest.length || scheme?.toLocaleLowerCase() !== 'bearer' || !token)
    return undefined;
  return token;
}
