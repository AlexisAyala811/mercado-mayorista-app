import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';

import { UserRole } from '../entities/user.entity.js';
import type { SessionIdentityReader } from '../application/ports/session-identity-reader.js';
import type { SessionTokenService } from '../security/session-token.service.js';
import { SessionAuthGuard } from './session-auth.guard.js';

function createContext(authorization?: string) {
  const request = { headers: { authorization } };
  const context = {
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
    const findActiveByTokenHash = vi.fn().mockResolvedValue(identity);
    const hash = vi.fn().mockReturnValue('token-hash');
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
        { findActiveByTokenHash: vi.fn() } as unknown as SessionIdentityReader,
        { hash: vi.fn() } as unknown as SessionTokenService,
      );

      await expect(
        guard.canActivate(createContext(value).context),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    },
  );
});
