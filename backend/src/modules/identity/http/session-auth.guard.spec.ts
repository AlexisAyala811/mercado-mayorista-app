import {
  type ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { UserRole } from '../entities/user.entity.js';
import type { SessionIdentityReader } from '../application/ports/session-identity-reader.js';
import type { SessionTokenService } from '../security/session-token.service.js';
import { SessionAuthGuard } from './session-auth.guard.js';
import { allowWhilePasswordChangeKey } from './password-change.decorator.js';

function createContext(authorization?: string, handler: () => void = () => {}) {
  const request = { headers: { authorization } };
  const context = {
    getClass: () => class {},
    getHandler: () => handler,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

describe('SessionAuthGuard', () => {
  it('attaches the active identity for a valid bearer token', async () => {
    const identity = {
      businessId: 'business-1',
      businessName: 'Mercado Central',
      expiresAt: new Date(Date.now() + 60_000),
      role: UserRole.Wholesaler,
      sessionId: 'session-1',
      userId: 'user-1',
      username: 'Mayorista',
    };
    const findActiveByTokenHash = jest.fn().mockResolvedValue(identity);
    const hash = jest.fn().mockReturnValue('token-hash');
    const guard = new SessionAuthGuard(
      { findActiveByTokenHash } as unknown as SessionIdentityReader,
      { hash } as unknown as SessionTokenService,
    );
    const { context, request } = createContext('Bearer secret-token');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(hash).toHaveBeenCalledWith('secret-token');
    expect(findActiveByTokenHash).toHaveBeenCalledWith('token-hash');
    expect(request).toHaveProperty('identity', identity);
  });

  it.each([undefined, '', 'Basic value', 'Bearer', 'Bearer one two'])(
    'rejects an invalid authorization value',
    async (value) => {
      const guard = new SessionAuthGuard(
        { findActiveByTokenHash: jest.fn() } as unknown as SessionIdentityReader,
        { hash: jest.fn() } as unknown as SessionTokenService,
      );

      await expect(
        guard.canActivate(createContext(value).context),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    },
  );

  // Spec 023: after a temporary password only the marked routes answer.
  it('requires the password change before any other route', async () => {
    const identity = {
      businessId: 'business-1',
      businessName: 'Mercado Central',
      expiresAt: new Date(Date.now() + 60_000),
      mustChangePassword: true,
      role: UserRole.Wholesaler,
      sessionId: 'session-1',
      userId: 'user-1',
      username: 'Mayorista',
    };
    const guard = new SessionAuthGuard(
      {
        findActiveByTokenHash: jest.fn().mockResolvedValue(identity),
      } as unknown as SessionIdentityReader,
      { hash: jest.fn().mockReturnValue('hash') } as unknown as SessionTokenService,
      new Reflector(),
    );

    const blocked = guard.canActivate(createContext('Bearer token').context);
    await expect(blocked).rejects.toBeInstanceOf(ForbiddenException);
    await expect(blocked).rejects.toMatchObject({
      response: { code: 'password-change-required' },
    });

    const allowed = () => {};
    Reflect.defineMetadata(allowWhilePasswordChangeKey, true, allowed);
    await expect(
      guard.canActivate(createContext('Bearer token', allowed).context),
    ).resolves.toBe(true);
  });
});
