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
import { ProviderEntity } from './entities/provider.entity.js';
import { PotatoVarietyEntity } from './entities/potato-variety.entity.js';
import { BuyerEntity } from './entities/buyer.entity.js';
import type {
  CreateBuyerDto,
  CreateProviderDto,
  CreateVarietyDto,
  UpdateBuyerDto,
  UpdateProviderDto,
  UpdateVarietyDto,
} from './http/catalog.dto.js';

@Injectable()
export class CatalogService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
    @InjectRepository(ProviderEntity)
    private readonly providers: Repository<ProviderEntity>,
    @InjectRepository(PotatoVarietyEntity)
    private readonly varieties: Repository<PotatoVarietyEntity>,
    @InjectRepository(BuyerEntity)
    private readonly buyers: Repository<BuyerEntity>,
  ) {}

  async listBuyers(businessId: string, page: PageQueryDto) {
    const [items, total] = await this.buyers.findAndCount({
      where: { businessId, isActive: true },
      order: { name: 'ASC' },
      skip: page.offset,
      take: page.limit,
    });
    return toPage(items, total, page);
  }

  async createBuyer(identity: SessionIdentity, input: CreateBuyerDto) {
    return this.withUniqueConstraint(
      'Ya existe un comprador activo con ese nombre.',
      () =>
        this.dataSource.transaction(async (manager) => {
          const repository = manager.getRepository(BuyerEntity);
          const buyer = await repository.save(
            repository.create({
              businessId: identity.businessId,
              creditLimitCents:
                input.creditLimitCents === undefined ||
                input.creditLimitCents === null
                  ? null
                  : String(input.creditLimitCents),
              destinationDepartment: normalizeOptional(
                input.destinationDepartment,
              ),
              isActive: true,
              name: input.name.trim(),
              phone: normalizeOptional(input.phone),
            }),
          );
          await this.record(
            manager,
            identity,
            'buyer.created',
            'buyer',
            buyer.id,
          );
          return buyer;
        }),
    );
  }

  async updateBuyer(
    identity: SessionIdentity,
    id: string,
    input: UpdateBuyerDto,
  ) {
    requireAnyChange(input);
    return this.withUniqueConstraint(
      'Ya existe un comprador activo con ese nombre.',
      () =>
        this.dataSource.transaction(async (manager) => {
          const repository = manager.getRepository(BuyerEntity);
          const buyer = await repository.findOne({
            where: { businessId: identity.businessId, id, isActive: true },
          });
          if (!buyer) throw new NotFoundException('Comprador no encontrado.');
          if (input.name !== undefined) buyer.name = input.name.trim();
          if (input.phone !== undefined)
            buyer.phone = normalizeOptional(input.phone);
          if (input.destinationDepartment !== undefined) {
            buyer.destinationDepartment = normalizeOptional(
              input.destinationDepartment,
            );
          }
          if (input.creditLimitCents !== undefined) {
            buyer.creditLimitCents =
              input.creditLimitCents === null
                ? null
                : String(input.creditLimitCents);
          }
          const saved = await repository.save(buyer);
          await this.record(
            manager,
            identity,
            'buyer.updated',
            'buyer',
            saved.id,
          );
          return saved;
        }),
    );
  }

  async deactivateBuyer(identity: SessionIdentity, id: string) {
    await this.dataSource.transaction(async (manager) => {
      const result = await manager
        .getRepository(BuyerEntity)
        .update(
          { businessId: identity.businessId, id, isActive: true },
          { isActive: false },
        );
      if (!result.affected)
        throw new NotFoundException('Comprador no encontrado.');
      await this.record(manager, identity, 'buyer.deactivated', 'buyer', id);
    });
  }

  async listProviders(businessId: string, page: PageQueryDto) {
    const [items, total] = await this.providers.findAndCount({
      where: { businessId, isActive: true },
      order: { name: 'ASC' },
      skip: page.offset,
      take: page.limit,
    });
    return toPage(items, total, page);
  }

  async createProvider(identity: SessionIdentity, input: CreateProviderDto) {
    return this.withUniqueConstraint(
      'Ya existe un proveedor activo con ese nombre.',
      () =>
        this.dataSource.transaction(async (manager) => {
          const repository = manager.getRepository(ProviderEntity);
          const provider = await repository.save(
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
            'provider.created',
            'provider',
            provider.id,
          );
          return provider;
        }),
    );
  }

  async updateProvider(
    identity: SessionIdentity,
    id: string,
    input: UpdateProviderDto,
  ) {
    requireAnyChange(input);
    return this.withUniqueConstraint(
      'Ya existe un proveedor activo con ese nombre.',
      () =>
        this.dataSource.transaction(async (manager) => {
          const repository = manager.getRepository(ProviderEntity);
          const provider = await repository.findOne({
            where: { businessId: identity.businessId, id, isActive: true },
          });
          if (!provider)
            throw new NotFoundException('Proveedor no encontrado.');
          if (input.name !== undefined) provider.name = input.name.trim();
          if (input.phone !== undefined)
            provider.phone = normalizeOptional(input.phone);
          const saved = await repository.save(provider);
          await this.record(
            manager,
            identity,
            'provider.updated',
            'provider',
            saved.id,
          );
          return saved;
        }),
    );
  }

  async deactivateProvider(identity: SessionIdentity, id: string) {
    await this.dataSource.transaction(async (manager) => {
      const result = await manager
        .getRepository(ProviderEntity)
        .update(
          { businessId: identity.businessId, id, isActive: true },
          { isActive: false },
        );
      if (!result.affected)
        throw new NotFoundException('Proveedor no encontrado.');
      await this.record(
        manager,
        identity,
        'provider.deactivated',
        'provider',
        id,
      );
    });
  }

  async listVarieties(businessId: string, page: PageQueryDto) {
    const [items, total] = await this.varieties.findAndCount({
      where: { businessId, isActive: true },
      order: { name: 'ASC' },
      skip: page.offset,
      take: page.limit,
    });
    return toPage(items, total, page);
  }

  async createVariety(identity: SessionIdentity, input: CreateVarietyDto) {
    return this.withUniqueConstraint(
      'Ya existe una variedad activa con ese nombre.',
      () =>
        this.dataSource.transaction(async (manager) => {
          const repository = manager.getRepository(PotatoVarietyEntity);
          const variety = await repository.save(
            repository.create({
              businessId: identity.businessId,
              isActive: true,
              name: input.name.trim(),
            }),
          );
          await this.record(
            manager,
            identity,
            'potato-variety.created',
            'potato-variety',
            variety.id,
          );
          return variety;
        }),
    );
  }

  async updateVariety(
    identity: SessionIdentity,
    id: string,
    input: UpdateVarietyDto,
  ) {
    requireAnyChange(input);
    return this.withUniqueConstraint(
      'Ya existe una variedad activa con ese nombre.',
      () =>
        this.dataSource.transaction(async (manager) => {
          const repository = manager.getRepository(PotatoVarietyEntity);
          const variety = await repository.findOne({
            where: { businessId: identity.businessId, id, isActive: true },
          });
          if (!variety) throw new NotFoundException('Variedad no encontrada.');
          if (input.name !== undefined) variety.name = input.name.trim();
          const saved = await repository.save(variety);
          await this.record(
            manager,
            identity,
            'potato-variety.updated',
            'potato-variety',
            saved.id,
          );
          return saved;
        }),
    );
  }

  async deactivateVariety(identity: SessionIdentity, id: string) {
    await this.dataSource.transaction(async (manager) => {
      const result = await manager
        .getRepository(PotatoVarietyEntity)
        .update(
          { businessId: identity.businessId, id, isActive: true },
          { isActive: false },
        );
      if (!result.affected)
        throw new NotFoundException('Variedad no encontrada.');
      await this.record(
        manager,
        identity,
        'potato-variety.deactivated',
        'potato-variety',
        id,
      );
    });
  }

  private async withUniqueConstraint<T>(
    message: string,
    operation: () => Promise<T>,
  ) {
    try {
      return await operation();
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException(message);
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

function isUniqueViolation(error: unknown) {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string }).code === '23505'
  );
}

function requireAnyChange(input: object) {
  if (Object.keys(input).length === 0)
    throw new BadRequestException(
      'Debe indicar al menos un campo para actualizar.',
    );
}
