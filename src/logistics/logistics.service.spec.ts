import type { DataSource, EntityManager, Repository } from 'typeorm';

import type { AuditService } from '../audit/audit.service.js';
import { UserRole } from '../identity/entities/user.entity.js';
import type { CarrierEntity } from './entities/carrier.entity.js';
import type { VehicleEntity } from './entities/vehicle.entity.js';
import { LogisticsService } from './logistics.service.js';

describe('LogisticsService', () => {
  it('deactivates a vehicle and records the event atomically within the authenticated business', async () => {
    const update = vi.fn().mockResolvedValue({ affected: 1 });
    const repository = { update } as unknown as Repository<VehicleEntity>;
    const manager = {
      getRepository: vi.fn().mockReturnValue(repository),
    } as unknown as EntityManager;
    const transaction = vi.fn(
      async (callback: (value: EntityManager) => Promise<unknown>) =>
        callback(manager),
    );
    const record = vi.fn().mockResolvedValue(undefined);
    const service = new LogisticsService(
      { transaction } as unknown as DataSource,
      { record } as unknown as AuditService,
      {} as Repository<CarrierEntity>,
      {} as Repository<VehicleEntity>,
    );
    const identity = {
      businessId: 'business-1',
      businessName: 'Mercado',
      expiresAt: new Date(Date.now() + 60_000),
      role: UserRole.Wholesaler,
      sessionId: 'session-1',
      userId: 'user-1',
      username: 'Mayorista',
    };

    await service.deactivateVehicle(identity, 'vehicle-1');

    expect(update).toHaveBeenCalledWith(
      { businessId: 'business-1', id: 'vehicle-1', isActive: true },
      { isActive: false },
    );
    expect(record).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        action: 'vehicle.deactivated',
        resourceId: 'vehicle-1',
      }),
    );
  });
});
