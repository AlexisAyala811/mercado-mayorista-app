import { ConflictException, NotFoundException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { DataSource, EntityManager } from 'typeorm';
import { AuditService } from '../audit/audit.service.js';
import { ReportsService } from '../reports/reports.service.js';
import { BuyerEntity } from '../catalog/entities/buyer.entity.js';
import { ProviderEntity } from '../catalog/entities/provider.entity.js';
import { UserRole } from '../identity/entities/user.entity.js';
import type { SessionIdentity } from '../identity/application/ports/session-identity-reader.js';
import { RolesGuard } from '../identity/http/roles.guard.js';
import { MessagingController } from './messaging.controller.js';
import { MessagingService } from './messaging.service.js';
import { ShareAttemptEntity } from './share-attempt.entity.js';
import { canTransition, validAttachment } from './share-rules.js';
import type { ShareAttemptDto } from './messaging.dto.js';

const identity = { businessId: 'business-a', userId: 'mayorista', role: UserRole.Wholesaler } as SessionIdentity;
const input = { clientOperationId: 'operation-a', recipientId: 'buyer-a', recipientKind: 'buyer', channel: 'whatsapp', filename: 'compra.pdf', mimeType: 'application/pdf', sizeBytes: 450, state: 'prepared' } satisfies ShareAttemptDto;
function setup() {
  const rows: ShareAttemptEntity[] = [];
  const journal = { findOneBy: vi.fn(async (where: Partial<ShareAttemptEntity>) => rows.find(row => row.businessId === where.businessId && row.clientOperationId === where.clientOperationId) ?? null), create: (value: object) => value, save: vi.fn(async (row: ShareAttemptEntity) => { if (!row.id) { row.id = `journal-${rows.length}`; rows.push(row); } return row; }) };
  const people = { findOneBy: vi.fn(async (where: { businessId: string; id: string }) => where.businessId === 'business-a' && where.id === 'buyer-a' ? { name: 'Cliente A' } : null) };
  const manager = { query: vi.fn(), getRepository: (entity: unknown) => entity === ShareAttemptEntity ? journal : entity === BuyerEntity || entity === ProviderEntity ? people : undefined } as unknown as EntityManager;
  const source = { transaction: async (action: (manager: EntityManager) => Promise<unknown>) => action(manager) } as unknown as DataSource;
  const record = vi.fn();
  const reports = { alerts: vi.fn(async () => ({ accountAlerts: [] })) };
  return { service: new MessagingService(source, { record } as unknown as AuditService, reports as unknown as ReportsService), rows, record, people, journal, reports };
}
it('accepts only compatible file metadata and rejects oversized or disguised attachments', () => {
  expect(validAttachment('venta.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 20 * 1024 * 1024)).toBe(true);
  expect(validAttachment('foto.png', 'image/png', 300)).toBe(true);
  for (const [name, mime, size] of [['virus.exe','application/pdf',10], ['../archivo.pdf','application/pdf',10], ['foto.pdf','image/png',10], ['archivo.pdf','application/pdf',20971521], ['archivo.pdf','application/pdf',0]] as const) expect(validAttachment(name,mime,size)).toBe(false);
  expect(canTransition('sharing_requested', 'prepared')).toBe(false);
});
it('preserves one journal and one audit on identical retries without touching financial repositories', async () => {
  const f = setup();
  for (let i = 0; i < 5; i++) await f.service.record(identity, input);
  expect(f.rows).toHaveLength(1); expect(f.record).toHaveBeenCalledTimes(1);
  await f.service.record(identity, { ...input, state: 'sharing_requested' });
  await f.service.record(identity, { ...input, state: 'sharing_requested' });
  expect(f.rows[0].state).toBe('sharing_requested'); expect(f.record).toHaveBeenCalledTimes(2);
  expect((await f.service.record(identity, input)).state).toBe('sharing_requested');
});
it('rejects a foreign counterparty and does not preserve a journal', async () => {
  const f = setup();
  await expect(f.service.record({ ...identity, businessId: 'business-b' }, input)).rejects.toBeInstanceOf(NotFoundException);
  expect(f.rows).toHaveLength(0); expect(f.record).not.toHaveBeenCalled();
});
it('rejects reusing an operation with another file or declaring delivery', async () => {
  const f = setup(); await f.service.record(identity, input);
  await expect(f.service.record(identity, { ...input, filename: 'otra.pdf' })).rejects.toBeInstanceOf(ConflictException);
  await f.service.record(identity, { ...input, state: 'failed' });
  await expect(f.service.record(identity, { ...input, state: 'sharing_requested' })).rejects.toBeInstanceOf(ConflictException);
});
it('uses the business from identity when reading financial notifications', async () => {
  const f = setup(); await f.service.alerts('business-b', { asOf: '2026-10-26', through: '2026-10-30' });
  expect(f.reports.alerts).toHaveBeenCalledWith('business-b', { asOf: '2026-10-26', through: '2026-10-30' });
});
it('protects every messaging endpoint with the real Mayorista role guard', async () => {
  const guard = new RolesGuard(new Reflector(), { recordDirect: vi.fn().mockResolvedValue(undefined) } as unknown as AuditService);
  for (const method of ['recipients','alerts','history','record'] as const) {
    const context = (role: UserRole) => ({ getClass: () => MessagingController, getHandler: () => MessagingController.prototype[method], switchToHttp: () => ({ getRequest: () => ({ identity: { ...identity, role }, method: 'GET', path: '/messaging' }) }) }) as unknown as ExecutionContext;
    await expect(guard.canActivate(context(UserRole.Assistant))).rejects.toMatchObject({ status: 403 });
    await expect(guard.canActivate(context(UserRole.Wholesaler))).resolves.toBe(true);
  }
});


