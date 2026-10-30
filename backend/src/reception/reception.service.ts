import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, type Repository } from 'typeorm';

import { AuditService } from '../audit/audit.service.js';
import { PotatoVarietyEntity } from '../catalog/entities/potato-variety.entity.js';
import { ProviderEntity } from '../catalog/entities/provider.entity.js';
import {
  requireSameOperation,
  sameMembers,
} from '../common/domain/operation-replay.js';
import type { SessionIdentity } from '../identity/application/ports/session-identity-reader.js';
import { VehicleEntity } from '../logistics/entities/vehicle.entity.js';
import { toPage } from '../common/http/page-query.dto.js';
import type { ReceptionsHistoryQueryDto } from './http/receptions-history-query.dto.js';
import {
  ReceptionEntity,
  ReceptionState,
} from './entities/reception.entity.js';
import type { CreateReceptionDto } from './http/create-reception.dto.js';
import type { VoidReceptionDto } from './http/void-reception.dto.js';

@Injectable()
export class ReceptionService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
    @InjectRepository(ReceptionEntity)
    private readonly receptions: Repository<ReceptionEntity>,
  ) {}

  async list(businessId: string, page: ReceptionsHistoryQueryDto) {
    if (page.from && page.to && page.from > page.to)
      throw new UnprocessableEntityException(
        'La fecha inicial debe ser anterior o igual a la final.',
      );
    const query = this.receptions
      .createQueryBuilder('reception')
      .leftJoinAndSelect('reception.expectedVarieties', 'variety')
      .leftJoinAndMapOne(
        'reception.provider',
        ProviderEntity,
        'provider',
        'provider.id = reception.providerId AND provider.businessId = reception.businessId',
      )
      .where('reception.businessId = :businessId', { businessId });
    if (page.from)
      query.andWhere('reception.receivedOn >= :from::date', {
        from: page.from,
      });
    if (page.to)
      query.andWhere('reception.receivedOn <= :to::date', { to: page.to });
    if (page.search)
      query.andWhere('strpos(lower(provider.name), lower(:participant)) > 0', {
        participant: page.search,
      });
    if (page.providerId)
      query.andWhere('reception.providerId = :providerId', {
        providerId: page.providerId,
      });
    if (page.state)
      query.andWhere('reception.state = :state', { state: page.state });
    const [items, total] = await query
      .orderBy('reception.receivedOn', 'DESC')
      .addOrderBy('reception.createdAt', 'DESC')
      .addOrderBy('reception.id', 'DESC')
      .skip(page.offset)
      .take(page.limit)
      .getManyAndCount();
    const views = items.map((item) => {
      const { provider, ...reception } = item as ReceptionEntity & {
        provider?: ProviderEntity;
      };
      return { ...reception, providerName: provider?.name ?? null };
    });
    return toPage(views, total, page);
  }

  async get(businessId: string, id: string) {
    const reception = await this.receptions.findOne({
      relations: { expectedVarieties: true },
      where: { businessId, id },
    });
    if (!reception) throw new NotFoundException('Recepción no encontrada.');
    const provider = await this.dataSource
      .getRepository(ProviderEntity)
      .findOneBy({ businessId, id: reception.providerId });
    return Object.assign({}, reception, {
      providerName: provider?.name ?? null,
    });
  }

  async create(identity: SessionIdentity, input: CreateReceptionDto) {
    const existing = await this.receptions.findOne({
      relations: { expectedVarieties: true },
      where: {
        businessId: identity.businessId,
        clientOperationId: input.clientOperationId,
      },
    });
    if (existing) {
      requireSameOperation(matchesReception(existing, input));
      return existing;
    }

    return this.dataSource.transaction(async (manager) => {
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
        [identity.businessId, input.clientOperationId],
      );
      const repository = manager.getRepository(ReceptionEntity);
      const concurrentExisting = await repository.findOne({
        relations: { expectedVarieties: true },
        where: {
          businessId: identity.businessId,
          clientOperationId: input.clientOperationId,
        },
      });
      if (concurrentExisting) {
        requireSameOperation(matchesReception(concurrentExisting, input));
        return concurrentExisting;
      }

      const provider = await manager.getRepository(ProviderEntity).findOne({
        select: { id: true },
        where: {
          businessId: identity.businessId,
          id: input.providerId,
          isActive: true,
        },
      });
      if (!provider)
        throw new UnprocessableEntityException(
          'El proveedor no está disponible para este negocio.',
        );

      if (input.vehicleId) {
        const vehicle = await manager.getRepository(VehicleEntity).findOne({
          select: { id: true },
          where: {
            businessId: identity.businessId,
            id: input.vehicleId,
            isActive: true,
          },
        });
        if (!vehicle)
          throw new UnprocessableEntityException(
            'El vehículo no está disponible para este negocio.',
          );
      }

      const varieties = await manager.getRepository(PotatoVarietyEntity).find({
        where: {
          businessId: identity.businessId,
          id: In(input.expectedVarietyIds),
          isActive: true,
        },
      });
      if (varieties.length !== input.expectedVarietyIds.length) {
        throw new UnprocessableEntityException(
          'Una o más variedades no están disponibles para este negocio.',
        );
      }

      const reception = await repository.save(
        repository.create({
          businessId: identity.businessId,
          clientOperationId: input.clientOperationId,
          createdByUserId: identity.userId,
          driverName: input.driverName.trim(),
          expectedVarieties: varieties,
          providerId: input.providerId,
          providerPhone: normalizeOptional(input.providerPhone),
          receivedOn: input.receivedOn,
          state: ReceptionState.Draft,
          vehicleId: input.vehicleId ?? null,
          voidOperationId: null,
          voidReason: null,
          voidedAt: null,
        }),
      );

      await this.audit.record(manager, {
        action: 'reception.created',
        actorUserId: identity.userId,
        businessId: identity.businessId,
        details: { clientOperationId: input.clientOperationId },
        resourceId: reception.id,
        resourceType: 'reception',
      });

      return reception;
    });
  }

  async void(identity: SessionIdentity, id: string, input: VoidReceptionDto) {
    return this.dataSource.transaction(async (manager) => {
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
        [identity.businessId, input.clientOperationId],
      );
      const repository = manager.getRepository(ReceptionEntity);
      const reception = await repository.findOne({
        lock: { mode: 'pessimistic_write' },
        where: { businessId: identity.businessId, id },
      });
      if (!reception) throw new NotFoundException('Recepción no encontrada.');
      if (reception.voidOperationId === input.clientOperationId)
        return reception;
      if (reception.version !== input.expectedReceptionVersion) {
        throw new ConflictException({
          code: 'reception-version-conflict',
          currentVersion: reception.version,
          message: 'La recepción cambió.',
        });
      }
      if (reception.state === ReceptionState.Settled) {
        throw new ConflictException(
          'Anule la liquidación de compra para revertir una recepción liquidada.',
        );
      }
      if (reception.state === ReceptionState.Voided)
        throw new ConflictException('La recepción ya fue anulada.');
      reception.state = ReceptionState.Voided;
      reception.voidOperationId = input.clientOperationId;
      reception.voidReason = input.reason;
      reception.voidedAt = new Date();
      reception.version += 1;
      const saved = await repository.save(reception);
      await this.audit.record(manager, {
        action: 'reception.voided',
        actorUserId: identity.userId,
        businessId: identity.businessId,
        details: { reason: input.reason },
        resourceId: reception.id,
        resourceType: 'reception',
      });
      return saved;
    });
  }
}

function matchesReception(
  reception: ReceptionEntity,
  input: CreateReceptionDto,
) {
  return (
    reception.providerId === input.providerId &&
    reception.receivedOn === input.receivedOn &&
    reception.driverName === input.driverName.trim() &&
    reception.vehicleId === (input.vehicleId ?? null) &&
    sameMembers(
      reception.expectedVarieties.map((variety) => variety.id),
      input.expectedVarietyIds,
    )
  );
}

function normalizeOptional(value?: string) {
  const normalized = value?.trim();
  return normalized || null;
}
