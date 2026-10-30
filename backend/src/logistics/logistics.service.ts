import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  QueryFailedError,
  type EntityManager,
  type Repository,
} from 'typeorm';

import { AuditService } from '../audit/audit.service.js';
import { toPage, type PageQueryDto } from '../common/http/page-query.dto.js';
import type { SessionIdentity } from '../identity/application/ports/session-identity-reader.js';
import { CarrierEntity } from './entities/carrier.entity.js';
import { VehicleEntity } from './entities/vehicle.entity.js';
import type {
  CreateCarrierDto,
  CreateVehicleDto,
  UpdateCarrierDto,
  UpdateVehicleDto,
} from './http/logistics.dto.js';

@Injectable()
export class LogisticsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
    @InjectRepository(CarrierEntity)
    private readonly carriers: Repository<CarrierEntity>,
    @InjectRepository(VehicleEntity)
    private readonly vehicles: Repository<VehicleEntity>,
  ) {}

  async listCarriers(businessId: string, page: PageQueryDto) {
    const [items, total] = await this.carriers.findAndCount({
      where: { businessId, isActive: true },
      order: { name: 'ASC' },
      skip: page.offset,
      take: page.limit,
    });
    return toPage(items, total, page);
  }

  async createCarrier(identity: SessionIdentity, input: CreateCarrierDto) {
    return this.withUniqueConstraint(
      'Ya existe un transportista activo con ese nombre.',
      () =>
        this.dataSource.transaction(async (manager) => {
          const repository = manager.getRepository(CarrierEntity);
          const carrier = await repository.save(
            repository.create({
              businessId: identity.businessId,
              isActive: true,
              name: input.name.trim(),
              phone: normalizeOptional(input.phone),
            }),
          );
          await this.record(
            manager,
            identity,
            'carrier.created',
            'carrier',
            carrier.id,
          );
          return carrier;
        }),
    );
  }

  async updateCarrier(
    identity: SessionIdentity,
    id: string,
    input: UpdateCarrierDto,
  ) {
    requireAnyChange(input);
    return this.withUniqueConstraint(
      'Ya existe un transportista activo con ese nombre.',
      () =>
        this.dataSource.transaction(async (manager) => {
          const repository = manager.getRepository(CarrierEntity);
          const carrier = await repository.findOne({
            where: { businessId: identity.businessId, id, isActive: true },
          });
          if (!carrier)
            throw new NotFoundException('Transportista no encontrado.');
          if (input.name !== undefined) carrier.name = input.name.trim();
          if (input.phone !== undefined)
            carrier.phone = normalizeOptional(input.phone);
          const saved = await repository.save(carrier);
          await this.record(
            manager,
            identity,
            'carrier.updated',
            'carrier',
            saved.id,
          );
          return saved;
        }),
    );
  }

  async deactivateCarrier(identity: SessionIdentity, id: string) {
    await this.dataSource.transaction(async (manager) => {
      const result = await manager
        .getRepository(CarrierEntity)
        .update(
          { businessId: identity.businessId, id, isActive: true },
          { isActive: false },
        );
      if (!result.affected)
        throw new NotFoundException('Transportista no encontrado.');
      await this.record(
        manager,
        identity,
        'carrier.deactivated',
        'carrier',
        id,
      );
    });
  }

  async listVehicles(businessId: string, page: PageQueryDto) {
    const [items, total] = await this.vehicles.findAndCount({
      relations: { carrier: true },
      where: { businessId, isActive: true },
      order: { plate: 'ASC' },
      skip: page.offset,
      take: page.limit,
    });
    return toPage(items, total, page);
  }

  async createVehicle(identity: SessionIdentity, input: CreateVehicleDto) {
    return this.withUniqueConstraint(
      'Ya existe un vehículo activo con esa placa.',
      () =>
        this.dataSource.transaction(async (manager) => {
          if (input.carrierId)
            await this.requireActiveCarrier(
              manager,
              identity.businessId,
              input.carrierId,
            );
          const repository = manager.getRepository(VehicleEntity);
          const vehicle = await repository.save(
            repository.create({
              businessId: identity.businessId,
              carrierId: input.carrierId ?? null,
              description: normalizeOptional(input.description),
              isActive: true,
              plate: normalizePlate(input.plate),
            }),
          );
          await this.record(
            manager,
            identity,
            'vehicle.created',
            'vehicle',
            vehicle.id,
          );
          return vehicle;
        }),
    );
  }

  async updateVehicle(
    identity: SessionIdentity,
    id: string,
    input: UpdateVehicleDto,
  ) {
    requireAnyChange(input);
    return this.withUniqueConstraint(
      'Ya existe un vehículo activo con esa placa.',
      () =>
        this.dataSource.transaction(async (manager) => {
          if (input.carrierId)
            await this.requireActiveCarrier(
              manager,
              identity.businessId,
              input.carrierId,
            );
          const repository = manager.getRepository(VehicleEntity);
          const vehicle = await repository.findOne({
            where: { businessId: identity.businessId, id, isActive: true },
          });
          if (!vehicle) throw new NotFoundException('Vehículo no encontrado.');
          if (input.plate !== undefined)
            vehicle.plate = normalizePlate(input.plate);
          if (input.carrierId !== undefined)
            vehicle.carrierId = input.carrierId;
          if (input.description !== undefined)
            vehicle.description = normalizeOptional(input.description);
          const saved = await repository.save(vehicle);
          await this.record(
            manager,
            identity,
            'vehicle.updated',
            'vehicle',
            saved.id,
          );
          return saved;
        }),
    );
  }

  async deactivateVehicle(identity: SessionIdentity, id: string) {
    await this.dataSource.transaction(async (manager) => {
      const result = await manager
        .getRepository(VehicleEntity)
        .update(
          { businessId: identity.businessId, id, isActive: true },
          { isActive: false },
        );
      if (!result.affected)
        throw new NotFoundException('Vehículo no encontrado.');
      await this.record(
        manager,
        identity,
        'vehicle.deactivated',
        'vehicle',
        id,
      );
    });
  }

  private async requireActiveCarrier(
    manager: EntityManager,
    businessId: string,
    id: string,
  ) {
    const carrier = await manager.getRepository(CarrierEntity).findOne({
      select: { id: true },
      where: { businessId, id, isActive: true },
    });
    if (!carrier) throw new NotFoundException('Transportista no encontrado.');
  }

  private async withUniqueConstraint<T>(
    message: string,
    operation: () => Promise<T>,
  ) {
    try {
      return await operation();
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === '23505'
      ) {
        throw new ConflictException(message);
      }
      throw error;
    }
  }

  private record(
    manager: EntityManager,
    identity: SessionIdentity,
    action: string,
    resourceType: string,
    resourceId: string,
  ) {
    return this.audit.record(manager, {
      action,
      actorUserId: identity.userId,
      businessId: identity.businessId,
      resourceId,
      resourceType,
    });
  }
}

function normalizeOptional(value?: string) {
  const normalized = value?.trim();
  return normalized || null;
}

function normalizePlate(value: string) {
  return value.trim().toLocaleUpperCase().replaceAll(/\s+/g, '');
}

function requireAnyChange(input: object) {
  if (Object.keys(input).length === 0)
    throw new BadRequestException(
      'Debe indicar al menos un campo para actualizar.',
    );
}
