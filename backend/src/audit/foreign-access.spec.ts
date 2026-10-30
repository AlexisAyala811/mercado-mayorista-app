import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';

import { UserRole } from '../identity/entities/user.entity.js';
import type { AuditEventEntity } from './audit-event.entity.js';
import { AuditService } from './audit.service.js';
import { auditForeignAccess } from './foreign-access.js';

const identity = {
  businessId: 'business-a',
  businessName: 'Negocio A',
  expiresAt: new Date('2099-01-01'),
  role: UserRole.Wholesaler,
  sessionId: 'session',
  userId: 'user-a',
  username: 'mayorista',
};

function fixture(existsElsewhere: boolean) {
  const exists = vi.fn().mockResolvedValue(existsElsewhere);
  const events = {
    create: vi.fn((value) => value),
    save: vi.fn(),
    manager: { getRepository: vi.fn(() => ({ exists })) },
  };
  const audit = new AuditService(
    events as unknown as Repository<AuditEventEntity>,
    {} as never,
  );
  return { audit, events, exists };
}

class SaleEntity {}

describe('auditForeignAccess', () => {
  it('records an attempt on a resource that belongs to another business', async () => {
    const f = fixture(true);
    await expect(
      auditForeignAccess(f.audit, identity, SaleEntity, 'sale-b', 'sale', () =>
        Promise.reject(new NotFoundException('Venta no encontrada.')),
      ),
    ).rejects.toThrow(NotFoundException);
    expect(f.exists).toHaveBeenCalledWith({ where: { id: 'sale-b' } });
    expect(f.events.save).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'authorization.cross-business-denied',
        actorUserId: 'user-a',
        businessId: 'business-a',
        resourceId: 'sale-b',
        resourceType: 'sale',
      }),
    );
  });

  it('does not audit an id that does not exist anywhere', async () => {
    const f = fixture(false);
    await expect(
      auditForeignAccess(f.audit, identity, SaleEntity, 'missing', 'sale', () =>
        Promise.reject(new NotFoundException()),
      ),
    ).rejects.toThrow(NotFoundException);
    expect(f.events.save).not.toHaveBeenCalled();
  });

  it('leaves successful lookups and other errors untouched', async () => {
    const f = fixture(true);
    await expect(
      auditForeignAccess(f.audit, identity, SaleEntity, 'sale-a', 'sale', () =>
        Promise.resolve('ok'),
      ),
    ).resolves.toBe('ok');
    await expect(
      auditForeignAccess(f.audit, identity, SaleEntity, 'sale-a', 'sale', () =>
        Promise.reject(new ForbiddenException()),
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(f.exists).not.toHaveBeenCalled();
  });
});
