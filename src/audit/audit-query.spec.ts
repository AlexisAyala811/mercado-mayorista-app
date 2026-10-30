import { BadRequestException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { Repository } from 'typeorm';
import { AuditEventEntity } from './audit-event.entity.js';
import { AuditQueryDto } from './audit-query.dto.js';
import { AuditService } from './audit.service.js';

it.each(['2026-02-30', '2026-1-02', '2026-10-26T00:00:00Z', '0000-01-01'])('rejects non-civil audit day %s', async fromDay => {
  expect((await validate(plainToInstance(AuditQueryDto, { fromDay }))).map(error => error.property)).toContain('fromDay');
});
it('rejects year zero at the upper date boundary too', async () => {
  expect((await validate(plainToInstance(AuditQueryDto, { toDay: '0000-12-31' }))).map(error => error.property)).toContain('toDay');
});
it('accepts leap days and legacy timestamp filters independently', async () => {
  expect(await validate(plainToInstance(AuditQueryDto, { fromDay: '2028-02-29', toDay: '2028-02-29', from: '2028-02-29T05:00:00Z' }))).toHaveLength(0);
});
it('applies business isolation, stable ordering, bounded pagination and an exclusive Lima day end', async () => {
  const builder = { where: vi.fn().mockReturnThis(), orderBy: vi.fn().mockReturnThis(), addOrderBy: vi.fn().mockReturnThis(), skip: vi.fn().mockReturnThis(), take: vi.fn().mockReturnThis(), andWhere: vi.fn().mockReturnThis(), getManyAndCount: vi.fn().mockResolvedValue([[], 21]) };
  const service = new AuditService({ createQueryBuilder: () => builder } as unknown as Repository<AuditEventEntity>, {} as ConfigService);
  const result = await service.list('business-a', plainToInstance(AuditQueryDto, { fromDay: '2026-10-26', toDay: '2026-10-26', limit: 20, offset: 20 }));
  expect(builder.where).toHaveBeenCalledWith('event.businessId = :businessId', { businessId: 'business-a' });
  expect(builder.orderBy).toHaveBeenCalledWith('event.occurredAt', 'DESC'); expect(builder.addOrderBy).toHaveBeenCalledWith('event.id', 'DESC');
  expect(builder.skip).toHaveBeenCalledWith(20); expect(builder.take).toHaveBeenCalledWith(20);
  expect(builder.andWhere).toHaveBeenCalledWith("event.occurredAt >= (CAST(:fromDay AS date)::timestamp AT TIME ZONE 'America/Lima')", { fromDay: '2026-10-26' });
  expect(builder.andWhere).toHaveBeenCalledWith("event.occurredAt < ((CAST(:toDay AS date) + 1)::timestamp AT TIME ZONE 'America/Lima')", { toDay: '2026-10-26' });
  expect(result).toEqual({ items: [], total: 21, limit: 20, offset: 20 });
});
it('rejects a reversed range before querying', async () => {
  const query = vi.fn();
  const service = new AuditService({ createQueryBuilder: query } as unknown as Repository<AuditEventEntity>, {} as ConfigService);
  await expect(service.list('business', plainToInstance(AuditQueryDto, { fromDay: '2026-10-27', toDay: '2026-10-26' }))).rejects.toBeInstanceOf(BadRequestException);
  expect(query).not.toHaveBeenCalled();
});
