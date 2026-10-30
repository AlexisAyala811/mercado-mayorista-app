import type { Repository } from 'typeorm';
import type { AuditService } from '../../audit/audit.service.js';
import { UserRole } from '../entities/user.entity.js';
import type { SessionEntity } from '../entities/session.entity.js';
import type { DelegationEntity } from '../entities/delegation.entity.js';
import { TypeOrmSessionIdentityReader } from './typeorm-session-identity.reader.js';

describe('TypeOrmSessionIdentityReader replacement expiration', () => {
  const sessionExpiry = new Date('2026-10-08T16:00:00Z');
  function fixture(role: UserRole, replacementExpiry: Date | null) {
    const session = {
      id: 'session-1',
      expiresAt: sessionExpiry,
      user: {
        id: 'assistant-1',
        role,
        username: 'Test',
        businessId: 'business-1',
        business: { displayName: 'Test business' },
      },
    };
    const query = {
      innerJoinAndSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      getOne: vi.fn().mockResolvedValue(session),
    };
    const sessions = {
      createQueryBuilder: vi.fn().mockReturnValue(query),
    } as unknown as Repository<SessionEntity>;
    const findOne = vi
      .fn()
      .mockResolvedValue(
        replacementExpiry
          ? { id: 'replacement-1', expiresAt: replacementExpiry }
          : null,
      );
    const recordDirect = vi.fn().mockResolvedValue(undefined);
    const reader = new TypeOrmSessionIdentityReader(
      sessions,
      { findOne } as unknown as Repository<DelegationEntity>,
      { recordDirect } as unknown as AuditService,
    );
    return { reader, session, findOne, recordDirect };
  }

  it.each(['2026-10-08T15:15:00Z', '2026-10-08T17:00:00Z'])(
    'returns the effective expiration for existing sessions when replacement ends at %s',
    async (end) => {
      const replacementExpiry = new Date(end);
      const { reader, session, findOne } = fixture(
        UserRole.Assistant,
        replacementExpiry,
      );
      const result = await reader.findActiveByTokenHash('test-hash');
      expect(result?.expiresAt.getTime()).toBe(
        Math.min(sessionExpiry.getTime(), replacementExpiry.getTime()),
      );
      expect(session.expiresAt).toEqual(sessionExpiry);
      expect(findOne).toHaveBeenCalledWith(
        expect.objectContaining({ select: { id: true, expiresAt: true } }),
      );
    },
  );

  it('rejects and audits an assistant without an active replacement', async () => {
    const { reader, recordDirect } = fixture(UserRole.Assistant, null);
    await expect(
      reader.findActiveByTokenHash('test-hash'),
    ).resolves.toBeUndefined();
    expect(recordDirect).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'authorization.delegation-denied' }),
    );
  });

  it('preserves wholesaler expiration without querying replacements', async () => {
    const { reader, findOne } = fixture(UserRole.Wholesaler, null);
    expect(
      (await reader.findActiveByTokenHash('test-hash'))?.expiresAt,
    ).toEqual(sessionExpiry);
    expect(findOne).not.toHaveBeenCalled();
  });
});
