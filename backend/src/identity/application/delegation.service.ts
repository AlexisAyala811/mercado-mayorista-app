import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  IsNull,
  LessThan,
  MoreThan,
  type Repository,
} from 'typeorm';

import { AuditService } from '../../audit/audit.service.js';
import { toPage, type PageQueryDto } from '../../common/http/page-query.dto.js';
import { DelegationEntity } from '../entities/delegation.entity.js';
import { SessionEntity } from '../entities/session.entity.js';
import { UserEntity, UserRole } from '../entities/user.entity.js';
import type { CreateDelegationDto } from '../http/identity-administration.dto.js';
import type { SessionIdentity } from './ports/session-identity-reader.js';

const maximumDurationMs = 24 * 60 * 60 * 1000;

@Injectable()
export class DelegationService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
    @InjectRepository(DelegationEntity)
    private readonly delegations: Repository<DelegationEntity>,
  ) {}

  async list(businessId: string, page: PageQueryDto) {
    const [items, total] = await this.delegations.findAndCount({
      where: { businessId },
      order: { startsAt: 'DESC' },
      skip: page.offset,
      take: page.limit,
    });
    return toPage(items, total, page);
  }

  async create(
    identity: SessionIdentity,
    assistantUserId: string,
    input: CreateDelegationDto,
  ) {
    const startsAt = new Date(input.startsAt);
    const expiresAt = new Date(input.expiresAt);
    if (expiresAt <= startsAt)
      throw new UnprocessableEntityException(
        'El vencimiento debe ser posterior al inicio.',
      );
    if (expiresAt.getTime() - startsAt.getTime() > maximumDurationMs) {
      throw new UnprocessableEntityException(
        'El reemplazo no puede superar 24 horas.',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
        [identity.businessId, assistantUserId],
      );
      const assistant = await manager.getRepository(UserEntity).findOne({
        select: { id: true },
        where: {
          businessId: identity.businessId,
          id: assistantUserId,
          isActive: true,
          role: UserRole.Assistant,
        },
      });
      if (!assistant) throw new NotFoundException('Encargado no encontrado.');

      const repository = manager.getRepository(DelegationEntity);
      const overlap = await repository.findOne({
        where: {
          assistantUserId,
          businessId: identity.businessId,
          expiresAt: MoreThan(startsAt),
          revokedAt: IsNull(),
          startsAt: LessThan(expiresAt),
        },
      });
      if (overlap)
        throw new ConflictException(
          'El Encargado ya tiene un reemplazo en ese periodo.',
        );

      const delegation = await repository.save(
        repository.create({
          assistantUserId,
          authorizedByUserId: identity.userId,
          businessId: identity.businessId,
          expiresAt,
          reason: normalizeOptional(input.reason),
          revokedAt: null,
          startsAt,
        }),
      );
      await this.audit.record(manager, {
        action: 'delegation.created',
        actorUserId: identity.userId,
        businessId: identity.businessId,
        resourceId: delegation.id,
        resourceType: 'delegation',
      });
      return delegation;
    });
  }

  async revoke(identity: SessionIdentity, id: string) {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(DelegationEntity);
      const delegation = await repository.findOne({
        where: { businessId: identity.businessId, id, revokedAt: IsNull() },
      });
      if (!delegation) throw new NotFoundException('Reemplazo no encontrado.');
      delegation.revokedAt = new Date();
      await repository.save(delegation);
      await manager
        .getRepository(SessionEntity)
        .createQueryBuilder()
        .update(SessionEntity)
        .set({ revokedAt: new Date() })
        .where('user_id = :userId', { userId: delegation.assistantUserId })
        .andWhere('revoked_at IS NULL')
        .execute();
      await this.audit.record(manager, {
        action: 'delegation.revoked',
        actorUserId: identity.userId,
        businessId: identity.businessId,
        resourceId: delegation.id,
        resourceType: 'delegation',
      });
    });
  }
}

function normalizeOptional(value?: string) {
  const normalized = value?.trim();
  return normalized || null;
}
