import { type ExecutionContext, ForbiddenException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';

import type { AuditService } from '../../audit/audit.service.js';
import { UserRole } from '../entities/user.entity.js';
import { RolesGuard } from './roles.guard.js';

function contextFor(role: UserRole) {
  return {
    getClass: () => class TestController {},
    getHandler: () => () => undefined,
    switchToHttp: () => ({
      getRequest: () => ({
        identity: { businessId: 'business-1', role, userId: 'user-1' },
        method: 'POST',
        path: '/inventory/lots/id/adjustments',
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const recordDirect = vi.fn().mockResolvedValue(undefined);
  const audit = { recordDirect } as unknown as AuditService;

  it('allows a role declared by the endpoint', async () => {
    const getAllAndOverride = vi.fn().mockReturnValue([UserRole.Wholesaler]);
    const guard = new RolesGuard(
      { getAllAndOverride } as unknown as Reflector,
      audit,
    );

    await expect(
      guard.canActivate(contextFor(UserRole.Wholesaler)),
    ).resolves.toBe(true);
  });

  it('denies and audits a role that is not declared by the endpoint', async () => {
    const getAllAndOverride = vi.fn().mockReturnValue([UserRole.Wholesaler]);
    const guard = new RolesGuard(
      { getAllAndOverride } as unknown as Reflector,
      audit,
    );

    await expect(
      guard.canActivate(contextFor(UserRole.Assistant)),
    ).rejects.toThrow(ForbiddenException);
    expect(recordDirect).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'authorization.denied',
        businessId: 'business-1',
      }),
    );
  });
});
