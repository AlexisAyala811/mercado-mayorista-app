import { UnprocessableEntityException } from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';

import type { AuditService } from '../../audit/audit.service.js';
import { DelegationEntity } from '../entities/delegation.entity.js';
import { UserRole } from '../entities/user.entity.js';
import { DelegationService } from './delegation.service.js';

describe('DelegationService', () => {
  const identity = {
    businessId: 'business-1',
    businessName: 'Mercado',
    expiresAt: new Date('2026-09-26T00:00:00Z'),
    role: UserRole.Wholesaler,
    sessionId: 'session-1',
    userId: 'user-1',
    username: 'Mayorista',
  };

  it('rejects a replacement longer than 24 hours before opening a transaction', async () => {
    const transaction = vi.fn();
    const service = new DelegationService(
      { transaction } as unknown as DataSource,
      { record: vi.fn() } as unknown as AuditService,
      {} as Repository<DelegationEntity>,
    );

    await expect(
      service.create(identity, 'assistant-1', {
        expiresAt: '2026-09-26T12:00:00.000Z',
        startsAt: '2026-09-25T11:59:59.000Z',
      }),
    ).rejects.toThrow(UnprocessableEntityException);
    expect(transaction).not.toHaveBeenCalled();
  });
});
