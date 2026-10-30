import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import type { EntityManager, Repository } from 'typeorm';

import { AuditEventEntity } from './audit-event.entity.js';
import type { AuditQueryDto } from './audit-query.dto.js';
import { toPage } from '../common/http/page-query.dto.js';

export type NewAuditEvent = {
  action: string;
  actorUserId: string | null;
  businessId: string | null;
  details?: Record<string, unknown>;
  resourceId: string | null;
  resourceType: string;
};

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditEventEntity)
    private readonly events: Repository<AuditEventEntity>,
    private readonly config: ConfigService,
  ) {}

  async record(manager: EntityManager, event: NewAuditEvent) {
    const repository = manager.getRepository(AuditEventEntity);
    await repository.save(
      repository.create({ ...event, details: event.details ?? {} }),
    );
  }

  async recordDirect(event: NewAuditEvent) {
    await this.events.save(
      this.events.create({ ...event, details: event.details ?? {} }),
    );
  }

  async list(businessId: string, query: AuditQueryDto) {
    if (query.fromDay && query.toDay && query.fromDay > query.toDay) {
      throw new BadRequestException('La fecha inicial no puede ser posterior a la final.');
    }
    const builder = this.events
      .createQueryBuilder('event')
      .where('event.businessId = :businessId', { businessId })
      .orderBy('event.occurredAt', 'DESC')
      .addOrderBy('event.id', 'DESC')
      .skip(query.offset)
      .take(query.limit);
    if (query.action)
      builder.andWhere('event.action = :action', { action: query.action });
    if (query.resourceType)
      builder.andWhere('event.resourceType = :resourceType', {
        resourceType: query.resourceType,
      });
    if (query.from)
      builder.andWhere('event.occurredAt >= :from', {
        from: new Date(query.from),
      });
    if (query.to)
      builder.andWhere('event.occurredAt <= :to', { to: new Date(query.to) });
    if (query.fromDay)
      builder.andWhere("event.occurredAt >= (CAST(:fromDay AS date)::timestamp AT TIME ZONE 'America/Lima')", { fromDay: query.fromDay });
    if (query.toDay)
      builder.andWhere("event.occurredAt < ((CAST(:toDay AS date) + 1)::timestamp AT TIME ZONE 'America/Lima')", { toDay: query.toDay });
    const [items, total] = await builder.getManyAndCount();
    return toPage(
      items.map((event) => ({
        action: event.action,
        actorUserId: event.actorUserId,
        businessId: event.businessId,
        details: event.details,
        id: event.id,
        occurredAt: event.occurredAt,
        resourceId: event.resourceId,
        resourceType: event.resourceType,
        retentionUntil: addYears(
          event.occurredAt,
          this.config.getOrThrow<number>('EVIDENCE_RETENTION_YEARS'),
        ),
      })),
      total,
      query,
    );
  }
}

function addYears(value: Date, years: number) {
  const result = new Date(value);
  result.setUTCFullYear(result.getUTCFullYear() + years);
  return result;
}
