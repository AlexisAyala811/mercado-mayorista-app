import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AuditService } from '../../audit/audit.service.js';
import type { SessionIdentity } from './ports/session-identity-reader.js';
import { SessionEntity } from '../entities/session.entity.js';

@Injectable()
export class RevokeSessionUseCase {
  constructor(
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
  ) {}

  async execute(identity: SessionIdentity): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager
        .getRepository(SessionEntity)
        .createQueryBuilder()
        .update(SessionEntity)
        .set({ revokedAt: new Date() })
        .where('id = :sessionId', { sessionId: identity.sessionId })
        .andWhere('revoked_at IS NULL')
        .execute();
      await this.audit.record(manager, {
        action: 'session.revoked',
        actorUserId: identity.userId,
        businessId: identity.businessId,
        resourceId: identity.sessionId,
        resourceType: 'session',
      });
    });
  }
}
