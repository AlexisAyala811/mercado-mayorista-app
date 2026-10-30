import {
  CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

import { SessionIdentityReader } from '../application/ports/session-identity-reader.js';
import { SessionTokenService } from '../security/session-token.service.js';
import type { AuthenticatedRequest } from './authenticated-request.js';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly sessions: SessionIdentityReader,
    private readonly tokens: SessionTokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = extractBearerToken(request.headers.authorization);
    if (!token) throw new UnauthorizedException('Sesión no válida.');

    const identity = await this.sessions.findActiveByTokenHash(
      this.tokens.hash(token),
    );
    if (!identity) throw new UnauthorizedException('Sesión no válida.');

    (request as AuthenticatedRequest).identity = identity;
    return true;
  }
}

function extractBearerToken(authorization?: string) {
  if (!authorization) return undefined;
  const [scheme, token, ...rest] = authorization.trim().split(/\s+/);
  if (rest.length || scheme?.toLocaleLowerCase() !== 'bearer' || !token)
    return undefined;
  return token;
}
