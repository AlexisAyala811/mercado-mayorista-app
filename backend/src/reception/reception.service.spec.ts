import { ConflictException } from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';

import type { AuditService } from '../audit/audit.service.js';
import { UserRole } from '../identity/entities/user.entity.js';
import type { ReceptionEntity } from './entities/reception.entity.js';
import { ReceptionService } from './reception.service.js';

describe('ReceptionService', () => {
  const identity = {
    businessId: 'business-1',
    businessName: 'Mercado',
    expiresAt: new Date(Date.now() + 60_000),
    role: UserRole.Wholesaler,
    sessionId: 'session-1',
    userId: 'user-1',
    username: 'Mayorista',
  };
  const input = {
    clientOperationId: '11111111-1111-4111-8111-111111111111',
    driverName: 'Conductor',
    expectedVarietyIds: ['22222222-2222-4222-8222-222222222222'],
    providerId: '33333333-3333-4333-8333-333333333333',
    receivedOn: '2026-09-24',
  };

  function retryFixture() {
    const existing = {
      id: 'reception-1',
      driverName: 'Conductor',
      expectedVarieties: [{ id: '22222222-2222-4222-8222-222222222222' }],
      providerId: '33333333-3333-4333-8333-333333333333',
      receivedOn: '2026-09-24',
      vehicleId: null,
    };
    const findOne = vi.fn().mockResolvedValue(existing);
    const transaction = vi.fn();
    const service = new ReceptionService(
      { transaction } as unknown as DataSource,
      {} as AuditService,
      { findOne } as unknown as Repository<ReceptionEntity>,
    );
    return { existing, findOne, service, transaction };
  }

  it('rejects an operation identifier reused for another provider', async () => {
    const { service, transaction } = retryFixture();
    await expect(
      service.create(identity, {
        ...input,
        providerId: '44444444-4444-4444-8444-444444444444',
      }),
    ).rejects.toThrow(ConflictException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('returns the existing business operation without creating a duplicate', async () => {
    const { existing, findOne, service, transaction } = retryFixture();

    const result = await service.create(identity, input);

    expect(result).toBe(existing);
    expect(findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          businessId: 'business-1',
          clientOperationId: '11111111-1111-4111-8111-111111111111',
        },
      }),
    );
    expect(transaction).not.toHaveBeenCalled();
  });
});
