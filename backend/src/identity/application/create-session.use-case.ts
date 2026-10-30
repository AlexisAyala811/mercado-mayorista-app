import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

import { AuditService } from '../../audit/audit.service.js';
import {
  VerifyCredentialsUseCase,
  type VerifiedIdentity,
} from './verify-credentials.use-case.js';
import { SessionEntity } from '../entities/session.entity.js';
import { DelegationEntity } from '../entities/delegation.entity.js';
import { UserRole } from '../entities/user.entity.js';
import { IsNull, LessThanOrEqual, MoreThan } from 'typeorm';
import { SessionTokenService } from '../security/session-token.service.js';

export type CreatedSession = {
  expiresAt: Date;
  identity: VerifiedIdentity;
  token: string;
};

@Injectable()
export class CreateSessionUseCase {
  constructor(
    private readonly verifyCredentials: VerifyCredentialsUseCase,
    private readonly tokens: SessionTokenService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
  ) {}

  async execute(
    username: string,
    password: string,
  ): Promise<CreatedSession | undefined> {
    const identity = await this.verifyCredentials.execute(username, password);
    if (!identity) return undefined;

    const ttlMinutes = this.config.getOrThrow<number>('SESSION_TTL_MINUTES');
    let expiresAt = new Date(Date.now() + ttlMinutes * 60_000);
    const token = this.tokens.issue();

    const created = await this.dataSource.transaction(async (manager) => {
      if (identity.role === UserRole.Assistant) {
        const now = new Date();
        const delegation = await manager
          .getRepository(DelegationEntity)
          .findOne({
            select: { id: true, expiresAt: true },
            where: {
              assistantUserId: identity.userId,
              businessId: identity.businessId,
              expiresAt: MoreThan(now),
              revokedAt: IsNull(),
              startsAt: LessThanOrEqual(now),
            },
          });
        if (!delegation) return false;
        expiresAt = new Date(
          Math.min(expiresAt.getTime(), delegation.expiresAt.getTime()),
        );
      }
      const sessions = manager.getRepository(SessionEntity);
      const session = await sessions.save(
        sessions.create({
          expiresAt,
          revokedAt: null,
          tokenHash: token.hash,
          userId: identity.userId,
        }),
      );
      await this.audit.record(manager, {
        action: 'session.created',
        actorUserId: identity.userId,
        businessId: identity.businessId,
        resourceId: session.id,
        resourceType: 'session',
      });
      return true;
    });

    if (!created) return undefined;
    return { expiresAt, identity, token: token.value };
  }
}
