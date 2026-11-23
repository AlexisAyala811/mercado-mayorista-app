import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { QueryFailedError, type DataSource, type EntityManager, type Repository } from 'typeorm';

import { memoryManager } from '../../../../test/support/memory-manager.js';

import type { AuditService } from '../../../shared/audit/audit.service.js';
import { UserRole } from '../../identity/entities/user.entity.js';
import { CarrierEntity } from './entities/carrier.entity.js';
import { VehicleEntity } from './entities/vehicle.entity.js';
import { LogisticsService } from './logistics.service.js';

describe('LogisticsService', () => {
  it('deactivates a vehicle and records the event atomically within the authenticated business', async () => {
    const update = jest.fn().mockResolvedValue({ affected: 1 });
    const repository = { update } as unknown as Repository<VehicleEntity>;
    const manager = {
      getRepository: jest.fn().mockReturnValue(repository),
    } as unknown as EntityManager;
    const transaction = jest.fn(
      async (callback: (value: EntityManager) => Promise<unknown>) =>
        callback(manager),
    );
    const record = jest.fn().mockResolvedValue(undefined);
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

// Spec 017 (T1705): carriers and vehicles without a database.

describe('LogisticsService rules', () => {
  const identity = {
    businessId: 'business-1',
    businessName: 'Mercado',
    expiresAt: new Date(Date.now() + 60_000),
    role: UserRole.Wholesaler,
    sessionId: 'session-1',
    userId: 'user-1',
    username: 'Mayorista',
  };
  function build() {
    const db = memoryManager();
    const record = jest.fn().mockResolvedValue(undefined);
    const service = new LogisticsService(
      db.dataSource,
      { record } as unknown as AuditService,
      db.repository(CarrierEntity) as never,
      db.repository(VehicleEntity) as never,
    );
    return { db, record, service };
  }

  it('creates a carrier with trimmed name and an empty phone stored as null', async () => {
    const { record, service } = build();
    const carrier = await service.createCarrier(identity, { name: '  Pedro Quispe ', phone: '   ' });
    expect(carrier).toMatchObject({ businessId: 'business-1', isActive: true, name: 'Pedro Quispe', phone: null });
    expect(record).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: 'carrier.created', resourceType: 'carrier' }));
  });

  it('normalizes a plate and links the vehicle only to an active carrier of the business', async () => {
    const { db, service } = build();
    const carrier = await service.createCarrier(identity, { name: 'Pedro' });
    const vehicle = await service.createVehicle(identity, { carrierId: carrier.id, description: ' Volvo FMX ', plate: ' abc 789 ' });
    expect(vehicle).toMatchObject({ carrierId: carrier.id, description: 'Volvo FMX', plate: 'ABC789' });
    db.rows(CarrierEntity).push({ businessId: 'business-2', id: 'other-carrier', isActive: true, name: 'Ajeno' });
    await expect(service.createVehicle(identity, { carrierId: 'other-carrier', plate: 'XYZ123' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates only the fields sent, and refuses an empty change or a missing record', async () => {
    const { service } = build();
    const carrier = await service.createCarrier(identity, { name: 'Pedro', phone: '999' });
    await expect(service.updateCarrier(identity, carrier.id, { phone: '988 ' })).resolves.toMatchObject({ name: 'Pedro', phone: '988' });
    await expect(service.updateCarrier(identity, carrier.id, {})).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.updateCarrier(identity, 'missing', { name: 'X' })).rejects.toBeInstanceOf(NotFoundException);
    const vehicle = await service.createVehicle(identity, { plate: 'B1P-204' });
    await expect(service.updateVehicle(identity, vehicle.id, { plate: 'b1p 205', carrierId: carrier.id })).resolves.toMatchObject({ carrierId: carrier.id, plate: 'B1P205' });
    await expect(service.updateVehicle(identity, 'missing', { plate: 'Z' })).rejects.toThrow('Vehículo no encontrado.');
  });

  it('lists only active records of the business and deactivates once', async () => {
    const { service } = build();
    const carrier = await service.createCarrier(identity, { name: 'Pedro' });
    await service.createVehicle(identity, { plate: 'ABC789' });
    expect((await service.listCarriers('business-1', { limit: 50, offset: 0 })).total).toBe(1);
    expect((await service.listVehicles('business-2', { limit: 50, offset: 0 })).total).toBe(0);
    await service.deactivateCarrier(identity, carrier.id);
    await expect(service.deactivateCarrier(identity, carrier.id)).rejects.toThrow('Transportista no encontrado.');
    expect((await service.listCarriers('business-1', { limit: 50, offset: 0 })).total).toBe(0);
  });

  it('maps a duplicate active name or plate to 409 and leaves other errors as they are', async () => {
    const duplicate = new QueryFailedError('INSERT', [], Object.assign(new Error('duplicate'), { code: '23505' }));
    const failing = (error: unknown) => new LogisticsService({ transaction: async () => { throw error; } } as never, {} as never, {} as never, {} as never);
    await expect(failing(duplicate).createCarrier(identity, { name: 'Pedro' })).rejects.toBeInstanceOf(ConflictException);
    await expect(failing(duplicate).createVehicle(identity, { plate: 'ABC789' })).rejects.toThrow('Ya existe un vehículo activo con esa placa.');
    await expect(failing(new Error('caída')).createCarrier(identity, { name: 'Pedro' })).rejects.toThrow('caída');
  });
});
