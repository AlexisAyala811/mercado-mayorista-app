import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuditService } from '../audit/audit.service.js';
import { UserRole } from '../identity/entities/user.entity.js';
import { RolesGuard } from '../identity/http/roles.guard.js';
import type { SessionIdentity } from '../identity/application/ports/session-identity-reader.js';
import { AnalyticsController } from './analytics.controller.js';
import type { AnalyticsService } from './analytics.service.js';

it('denies an authenticated assistant at the analytics controller and audits without returning data', async () => {
  const series = vi.fn();
  const recordDirect = vi.fn().mockResolvedValue(undefined);
  const controller = new AnalyticsController({
    series,
  } as unknown as AnalyticsService);
  const guard = new RolesGuard(new Reflector(), {
    recordDirect,
  } as unknown as AuditService);
  const identity: SessionIdentity = {
    businessId: 'business-a',
    businessName: 'Business A',
    expiresAt: new Date('2030-01-01'),
    role: UserRole.Assistant,
    sessionId: 'session',
    userId: 'assistant',
    username: 'Encargado',
  };
  const context = {
    getHandler: () => controller.series.bind(controller),
    getClass: () => AnalyticsController,
    switchToHttp: () => ({
      getRequest: () => ({
        identity,
        method: 'GET',
        path: '/analytics/series',
      }),
    }),
  } as unknown as ExecutionContext;
  await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  expect(series).not.toHaveBeenCalled();
  expect(recordDirect).toHaveBeenCalledWith(
    expect.objectContaining({
      action: 'authorization.denied',
      businessId: 'business-a',
      actorUserId: 'assistant',
    }),
  );
  identity.role = UserRole.Wholesaler;
  expect(await guard.canActivate(context)).toBe(true);
  await controller.series(identity, { from: '2026-10-01', to: '2026-10-06' });
  expect(series).toHaveBeenCalledWith('business-a', {
    from: '2026-10-01',
    to: '2026-10-06',
  });
});
