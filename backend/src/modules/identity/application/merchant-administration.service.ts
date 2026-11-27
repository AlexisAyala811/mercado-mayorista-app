import { createHash } from 'node:crypto';

import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  DataSource,
  type EntityManager,
  IsNull,
  MoreThan,
  QueryFailedError,
} from 'typeorm';

import { AuditService } from '../../../shared/audit/audit.service.js';
import { requireSameOperation } from '../../../platform/common/domain/operation-replay.js';
import { toPage } from '../../../platform/common/http/page-query.dto.js';
import { AdminOperationEntity } from '../entities/admin-operation.entity.js';
import { BusinessEntity, BusinessKind } from '../entities/business.entity.js';
import { SessionEntity } from '../entities/session.entity.js';
import { UserEntity, UserRole } from '../entities/user.entity.js';
import type {
  CreateMerchantDto,
  MerchantActionDto,
  MerchantQueryDto,
  ResetMerchantPasswordDto,
} from '../http/merchant-administration.dto.js';
import { PasswordHasher } from '../security/password-hasher.js';
import type { SessionIdentity } from './ports/session-identity-reader.js';

export type MerchantSummary = {
  createdAt: Date;
  displayName: string;
  id: string;
  isActive: boolean;
  wholesaler: {
    id: string;
    isActive: boolean;
    lastLoginAt: Date | null;
    mustChangePassword: boolean;
    username: string;
  } | null;
};

type AdminAction =
  | 'merchant.created'
  | 'merchant.password-reset'
  | 'merchant.reactivated'
  | 'merchant.sessions-revoked'
  | 'merchant.suspended';

// Spec 023: the Administrator manages merchant accounts (a business and its
// Wholesaler) and gives account support. It never reads or writes the
// merchants' operations: this service only touches businesses, users and
// sessions. Each action is idempotent by clientOperationId, runs in one
// transaction and is audited in the merchant and in the platform business.
@Injectable()
export class MerchantAdministrationService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async list(query: MerchantQueryDto) {
    const base = this.dataSource
      .getRepository(BusinessEntity)
      .createQueryBuilder('business')
      .leftJoin(
        UserEntity,
        'wholesaler',
        'wholesaler.businessId = business.id AND wholesaler.role = :role',
        { role: UserRole.Wholesaler },
      )
      .where('business.kind = :kind', { kind: BusinessKind.Merchant });
    if (query.search)
      base.andWhere(
        "(business.displayName ILIKE :search ESCAPE '\\' OR wholesaler.username ILIKE :search ESCAPE '\\')",
        { search: `%${escapeLike(query.search)}%` },
      );

    const total = await base.clone().getCount();
    const rows = await base
      .select('business.id', 'id')
      .addSelect('business.displayName', 'displayName')
      .addSelect('business.isActive', 'isActive')
      .addSelect('business.createdAt', 'createdAt')
      .addSelect('wholesaler.id', 'wholesalerId')
      .addSelect('wholesaler.username', 'username')
      .addSelect('wholesaler.isActive', 'wholesalerIsActive')
      .addSelect('wholesaler.lastLoginAt', 'lastLoginAt')
      .addSelect('wholesaler.mustChangePassword', 'mustChangePassword')
      .orderBy('business.displayName', 'ASC')
      .addOrderBy('business.id', 'ASC')
      .offset(query.offset)
      .limit(query.limit)
      .getRawMany<MerchantRow>();
    return toPage(rows.map(fromRow), total, query);
  }

  async status(id: string) {
    const manager = this.dataSource.manager;
    const business = await findMerchant(manager, id);
    const wholesaler = await findWholesaler(manager, business.id);
    const now = new Date();
    const openSessions = await manager.getRepository(SessionEntity).count({
      where: {
        expiresAt: MoreThan(now),
        revokedAt: IsNull(),
        user: { businessId: business.id },
      },
    });
    const activeAssistants = await manager.getRepository(UserEntity).count({
      where: {
        businessId: business.id,
        isActive: true,
        role: UserRole.Assistant,
      },
    });
    return {
      activeAssistants,
      failedLoginAttempts: wholesaler?.failedLoginAttempts ?? 0,
      lastFailedLoginAt: wholesaler?.lastFailedLoginAt ?? null,
      merchant: summary(business, wholesaler),
      openSessions,
    };
  }

  async create(identity: SessionIdentity, input: CreateMerchantDto) {
    const passwordHash = await this.passwordHasher.hash(
      input.temporaryPassword,
    );
    try {
      return await this.run(
        identity,
        'merchant.created',
        input.clientOperationId,
        {
          businessName: input.businessName,
          password: secretFingerprint(
            input.clientOperationId,
            input.temporaryPassword,
          ),
          username: input.username.toLocaleLowerCase(),
        },
        async (manager) => {
          const businesses = manager.getRepository(BusinessEntity);
          const business = await businesses.save(
            businesses.create({
              displayName: input.businessName,
              isActive: true,
              kind: BusinessKind.Merchant,
            }),
          );
          const users = manager.getRepository(UserEntity);
          const wholesaler = await users.save(
            users.create({
              businessId: business.id,
              isActive: true,
              mustChangePassword: true,
              passwordHash,
              role: UserRole.Wholesaler,
              username: input.username,
            }),
          );
          return {
            merchantId: business.id,
            reason: null,
            result: summary(business, wholesaler),
          };
        },
      );
    } catch (error) {
      if (isUniqueViolation(error, 'uq_users_username_ci'))
        throw new ConflictException({
          code: 'username-taken',
          message: 'El nombre de usuario ya está registrado.',
        });
      throw error;
    }
  }

  suspend(identity: SessionIdentity, id: string, input: MerchantActionDto) {
    return this.run(
      identity,
      'merchant.suspended',
      input.clientOperationId,
      { id, reason: input.reason },
      async (manager) => {
        const business = await findMerchant(manager, id, true);
        if (!business.isActive)
          throw new UnprocessableEntityException({
            code: 'merchant-already-suspended',
            message: 'El comerciante ya está suspendido.',
          });
        business.isActive = false;
        await manager.getRepository(BusinessEntity).save(business);
        const revokedSessions = await revokeBusinessSessions(
          manager,
          business.id,
        );
        return {
          details: { revokedSessions },
          merchantId: business.id,
          reason: input.reason,
          result: summary(business, await findWholesaler(manager, id)),
        };
      },
    );
  }

  reactivate(identity: SessionIdentity, id: string, input: MerchantActionDto) {
    return this.run(
      identity,
      'merchant.reactivated',
      input.clientOperationId,
      { id, reason: input.reason },
      async (manager) => {
        const business = await findMerchant(manager, id, true);
        if (business.isActive)
          throw new UnprocessableEntityException({
            code: 'merchant-already-active',
            message: 'El comerciante ya está activo.',
          });
        business.isActive = true;
        await manager.getRepository(BusinessEntity).save(business);
        return {
          merchantId: business.id,
          reason: input.reason,
          result: summary(business, await findWholesaler(manager, id)),
        };
      },
    );
  }

  async resetPassword(
    identity: SessionIdentity,
    id: string,
    input: ResetMerchantPasswordDto,
  ) {
    const passwordHash = await this.passwordHasher.hash(
      input.temporaryPassword,
    );
    return this.run(
      identity,
      'merchant.password-reset',
      input.clientOperationId,
      {
        id,
        password: secretFingerprint(
          input.clientOperationId,
          input.temporaryPassword,
        ),
        reason: input.reason,
      },
      async (manager) => {
        const business = await findMerchant(manager, id);
        const wholesaler = await findWholesaler(manager, business.id);
        if (!wholesaler?.isActive)
          throw new UnprocessableEntityException({
            code: 'wholesaler-inactive',
            message: 'El comerciante no tiene un Mayorista activo.',
          });
        Object.assign(wholesaler, {
          failedLoginAttempts: 0,
          lastFailedLoginAt: null,
          mustChangePassword: true,
          passwordHash,
        });
        await manager.getRepository(UserEntity).save(wholesaler);
        const revoked = await manager
          .getRepository(SessionEntity)
          .update(
            { revokedAt: IsNull(), userId: wholesaler.id },
            { revokedAt: new Date() },
          );
        return {
          details: { revokedSessions: revoked.affected ?? 0 },
          merchantId: business.id,
          reason: input.reason,
          result: summary(business, wholesaler),
        };
      },
    );
  }

  revokeSessions(
    identity: SessionIdentity,
    id: string,
    input: MerchantActionDto,
  ) {
    return this.run(
      identity,
      'merchant.sessions-revoked',
      input.clientOperationId,
      { id, reason: input.reason },
      async (manager) => {
        const business = await findMerchant(manager, id);
        const revokedSessions = await revokeBusinessSessions(
          manager,
          business.id,
        );
        return {
          details: { revokedSessions },
          merchantId: business.id,
          reason: input.reason,
          result: { merchantId: business.id, revokedSessions },
        };
      },
    );
  }

  // One transaction per action: replay check, the change, the operation
  // record and the audit in both businesses.
  private run<T extends object>(
    identity: SessionIdentity,
    action: AdminAction,
    clientOperationId: string,
    request: Record<string, unknown>,
    work: (manager: EntityManager) => Promise<{
      details?: Record<string, unknown>;
      merchantId: string;
      reason: string | null;
      result: T;
    }>,
  ): Promise<T> {
    const fingerprint = createHash('sha256')
      .update(JSON.stringify({ action, ...request }))
      .digest('hex');
    return this.dataSource.transaction(async (manager) => {
      // Two concurrent retries of one operation wait for each other.
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1, 23))',
        [clientOperationId],
      );
      const operations = manager.getRepository(AdminOperationEntity);
      const previous = await operations.findOne({
        where: { clientOperationId },
      });
      if (previous) {
        requireSameOperation(
          previous.adminUserId === identity.userId &&
            previous.fingerprint === fingerprint,
        );
        return previous.result as T;
      }

      const outcome = await work(manager);
      await operations.save(
        operations.create({
          action,
          adminUserId: identity.userId,
          clientOperationId,
          fingerprint,
          merchantBusinessId: outcome.merchantId,
          result: JSON.parse(JSON.stringify(outcome.result)) as Record<
            string,
            unknown
          >,
        }),
      );
      const details = {
        ...outcome.details,
        clientOperationId,
        ...(outcome.reason ? { reason: outcome.reason } : {}),
      };
      // The merchant sees that support acted on its account...
      await this.audit.record(manager, {
        action,
        actorUserId: identity.userId,
        businessId: outcome.merchantId,
        details,
        resourceId: outcome.merchantId,
        resourceType: 'business',
      });
      // ...and the platform keeps its own trail of every support action.
      await this.audit.record(manager, {
        action,
        actorUserId: identity.userId,
        businessId: identity.businessId,
        details,
        resourceId: outcome.merchantId,
        resourceType: 'business',
      });
      return outcome.result;
    });
  }
}

type MerchantRow = {
  createdAt: Date;
  displayName: string;
  id: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  mustChangePassword: boolean | null;
  username: string | null;
  wholesalerId: string | null;
  wholesalerIsActive: boolean | null;
};

function fromRow(row: MerchantRow): MerchantSummary {
  return {
    createdAt: row.createdAt,
    displayName: row.displayName,
    id: row.id,
    isActive: row.isActive,
    wholesaler: row.wholesalerId
      ? {
          id: row.wholesalerId,
          isActive: row.wholesalerIsActive ?? false,
          lastLoginAt: row.lastLoginAt,
          mustChangePassword: row.mustChangePassword ?? false,
          username: row.username ?? '',
        }
      : null,
  };
}

function summary(
  business: BusinessEntity,
  wholesaler: UserEntity | null,
): MerchantSummary {
  return {
    createdAt: business.createdAt,
    displayName: business.displayName,
    id: business.id,
    isActive: business.isActive,
    wholesaler: wholesaler
      ? {
          id: wholesaler.id,
          isActive: wholesaler.isActive,
          lastLoginAt: wholesaler.lastLoginAt,
          mustChangePassword: wholesaler.mustChangePassword,
          username: wholesaler.username,
        }
      : null,
  };
}

// The platform business is never a merchant: it answers 404 like any
// unknown id, so the Administrator cannot suspend itself.
async function findMerchant(manager: EntityManager, id: string, lock = false) {
  const business = await manager.getRepository(BusinessEntity).findOne({
    ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    where: { id, kind: BusinessKind.Merchant },
  });
  if (!business) throw new NotFoundException('Comerciante no encontrado.');
  return business;
}

function findWholesaler(manager: EntityManager, businessId: string) {
  return manager.getRepository(UserEntity).findOne({
    order: { createdAt: 'ASC' },
    where: { businessId, role: UserRole.Wholesaler },
  });
}

async function revokeBusinessSessions(
  manager: EntityManager,
  businessId: string,
) {
  const result = await manager
    .createQueryBuilder()
    .update(SessionEntity)
    .set({ revokedAt: () => 'now()' })
    .where('revoked_at IS NULL')
    .andWhere(
      'user_id IN (SELECT id FROM users WHERE business_id = :businessId)',
      {
        businessId,
      },
    )
    .execute();
  return result.affected ?? 0;
}

// The temporary password never reaches the operation record; only a digest
// salted with the operation id, to tell a retry from a different request.
function secretFingerprint(clientOperationId: string, secret: string) {
  return createHash('sha256')
    .update(`${clientOperationId}:${secret}`)
    .digest('hex');
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

function isUniqueViolation(error: unknown, constraint: string) {
  if (!(error instanceof QueryFailedError)) return false;
  const driver = error.driverError as { code?: string; constraint?: string };
  return driver.code === '23505' && driver.constraint === constraint;
}
