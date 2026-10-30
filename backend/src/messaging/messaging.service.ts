import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ProviderEntity } from '../catalog/entities/provider.entity.js';
import { BuyerEntity } from '../catalog/entities/buyer.entity.js';
import { AuditService } from '../audit/audit.service.js';
import { ReportsService } from '../reports/reports.service.js';
import type { SessionIdentity } from '../identity/application/ports/session-identity-reader.js';
import type { ReportAlertsQueryDto } from '../reports/http/report-query.dto.js';
import type { ShareAttemptDto } from './messaging.dto.js';
import { ShareAttemptEntity } from './share-attempt.entity.js';
import { canTransition, validAttachment } from './share-rules.js';

@Injectable()
export class MessagingService {
  constructor(private readonly dataSource: DataSource, private readonly audit: AuditService, private readonly reports: ReportsService) {}

  async recipients(businessId: string) {
    const [providers, buyers] = await Promise.all([
      this.dataSource.getRepository(ProviderEntity).find({ where: { businessId, isActive: true }, select: { id: true, name: true, phone: true }, order: { name: 'ASC' } }),
      this.dataSource.getRepository(BuyerEntity).find({ where: { businessId, isActive: true }, select: { id: true, name: true, phone: true }, order: { name: 'ASC' } }),
    ]);
    return [...providers.map(value => ({ id: value.id, name: value.name, phone: value.phone, kind: 'provider' as const })), ...buyers.map(value => ({ id: value.id, name: value.name, phone: value.phone, kind: 'buyer' as const }))];
  }
  alerts(businessId: string, query: ReportAlertsQueryDto) { return this.reports.alerts(businessId, query); }
  history(businessId: string) {
    return this.dataSource.getRepository(ShareAttemptEntity).find({ where: { businessId }, order: { createdAt: 'DESC', id: 'DESC' }, take: 50 });
  }
  async record(identity: SessionIdentity, input: ShareAttemptDto) {
    if (!validAttachment(input.filename, input.mimeType, input.sizeBytes)) throw new UnprocessableEntityException('Selecciona un PDF, DOC/DOCX o imagen compatible de hasta 20 MiB.');
    return this.dataSource.transaction(async manager => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))', [identity.businessId, input.clientOperationId]);
      const repository = manager.getRepository(ShareAttemptEntity);
      let row = await repository.findOneBy({ businessId: identity.businessId, clientOperationId: input.clientOperationId });
      if (row) {
        if (row.actorUserId !== identity.userId || row.recipientId !== input.recipientId || row.recipientKind !== input.recipientKind || row.channel !== input.channel || row.filename !== input.filename || row.mimeType !== input.mimeType || row.sizeBytes !== input.sizeBytes) throw new ConflictException('El identificador ya pertenece a otra preparación.');
        if (row.state === input.state) return row;
        // A delayed preparation retry returns the already-conserved result.
        if (input.state === 'prepared') return row;
        if (!canTransition(row.state, input.state)) throw new ConflictException('Este intento ya terminó. Prepara otro para compartir de nuevo.');
        row.state = input.state;
      } else {
        if (input.state !== 'prepared') throw new ConflictException('Primero debes preparar el archivo.');
        const recipient = input.recipientKind === 'buyer'
          ? await manager.getRepository(BuyerEntity).findOneBy({ id: input.recipientId, businessId: identity.businessId, isActive: true })
          : await manager.getRepository(ProviderEntity).findOneBy({ id: input.recipientId, businessId: identity.businessId, isActive: true });
        if (!recipient) throw new NotFoundException('La contraparte no está disponible en este negocio.');
        row = repository.create({ clientOperationId: input.clientOperationId, recipientId: input.recipientId, recipientKind: input.recipientKind, channel: input.channel, filename: input.filename, mimeType: input.mimeType, sizeBytes: input.sizeBytes, state: input.state, businessId: identity.businessId, actorUserId: identity.userId, recipientName: recipient.name });
      }
      const saved = await repository.save(row);
      await this.audit.record(manager, { action: `messaging.${saved.state}`, actorUserId: identity.userId, businessId: identity.businessId, resourceId: saved.id, resourceType: 'message-share-attempt', details: { recipientId: saved.recipientId, recipientKind: saved.recipientKind, channelIntended: saved.channel, filename: saved.filename, mimeType: saved.mimeType, sizeBytes: saved.sizeBytes, deliveryVerified: false } });
      return saved;
    });
  }
}
