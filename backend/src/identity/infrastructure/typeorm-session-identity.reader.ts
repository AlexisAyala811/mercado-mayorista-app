import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThan, IsNull, type Repository } from 'typeorm';

import {
  SessionIdentityReader,
  type SessionIdentity,
} from '../application/ports/session-identity-reader.js';
import { SessionEntity } from '../entities/session.entity.js';
import { DelegationEntity } from '../entities/delegation.entity.js';
import { UserRole } from '../entities/user.entity.js';
import { AuditService } from '../../audit/audit.service.js';

@Injectable()
export class TypeOrmSessionIdentityReader implements SessionIdentityReader {
  constructor(
    @InjectRepository(SessionEntity)
    private readonly sessions: Repository<SessionEntity>,
    @InjectRepository(DelegationEntity)
    private readonly delegations: Repository<DelegationEntity>,
    private readonly audit: AuditService,
  ) {}

  async findActiveByTokenHash(
    tokenHash: string,
  ): Promise<SessionIdentity | undefined> {
    const session = await this.sessions
      .createQueryBuilder('session')
      .innerJoinAndSelect('session.user', 'user', 'user.isActive = true')
      .innerJoinAndSelect(
        'user.business',
        'business',
        'business.isActive = true',
      )
      .where('session.tokenHash = :tokenHash', { tokenHash })
      .andWhere('session.revokedAt IS NULL')
      .andWhere('session.expiresAt > :now', { now: new Date() })
      .getOne();

    if (!session) return undefined;

    let expiresAt = session.expiresAt;

    if (session.user.role === UserRole.Assistant) {
      const now = new Date();
      const delegation = await this.delegations.findOne({
        select: { id: true, expiresAt: true },
        where: {
          assistantUserId: session.user.id,
          businessId: session.user.businessId,
          expiresAt: MoreThan(now),
          revokedAt: IsNull(),
          startsAt: LessThanOrEqual(now),
        },
      });
      if (!delegation) {
        await this.audit.recordDirect({
          action: 'authorization.delegation-denied',
          actorUserId: session.user.id,
          businessId: session.user.businessId,
          details: { sessionId: session.id },
          resourceId: session.id,
          resourceType: 'session',
        });
        return undefined;
      }
      expiresAt = new Date(
        Math.min(expiresAt.getTime(), delegation.expiresAt.getTime()),
      );
    }

    return {
      businessId: session.user.businessId,
      businessName: session.user.business.displayName,
      expiresAt,
      role: session.user.role,
      sessionId: session.id,
      userId: session.user.id,
      username: session.user.username,
    };
  }
}
