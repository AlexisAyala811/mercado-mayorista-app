import type { ConfigService } from '@nestjs/config';
import type { DataSource, EntityManager, Repository } from 'typeorm';

import type { AuditService } from '../../audit/audit.service.js';
import { CreateSessionUseCase } from './create-session.use-case.js';
import type {
  VerifyCredentialsUseCase,
  VerifiedIdentity,
} from './verify-credentials.use-case.js';
import { SessionEntity } from '../entities/session.entity.js';
import { DelegationEntity } from '../entities/delegation.entity.js';
import { UserRole } from '../entities/user.entity.js';
import type { SessionTokenService } from '../security/session-token.service.js';

describe('CreateSessionUseCase', () => {
  afterEach(() => vi.useRealTimers());
  const identity: VerifiedIdentity = {
    businessId: 'business-1',
    role: UserRole.Wholesaler,
    userId: 'user-1',
    username: 'Mayorista',
  };

  it.each([15, 120])(
    'bounds the persisted and returned assistant session by a %i minute replacement',
    async (replacementMinutes) => {
      vi.useFakeTimers();
      const now = new Date('2026-10-08T15:00:00.000Z');
      vi.setSystemTime(now);
      const replacementExpiresAt = new Date(
        now.getTime() + replacementMinutes * 60_000,
      );
      const expected = new Date(
        now.getTime() + Math.min(60, replacementMinutes) * 60_000,
      );
      const delegations = {
        findOne: vi
          .fn()
          .mockResolvedValue({
            id: 'replacement-1',
            expiresAt: replacementExpiresAt,
          }),
      };
      const sessions = {
        create: vi.fn((value) => value),
        save: vi.fn().mockResolvedValue({ id: 'session-1' }),
      };
      const manager = {
        getRepository: vi.fn((entity) =>
          entity === DelegationEntity ? delegations : sessions,
        ),
      } as unknown as EntityManager;
      const useCase = new CreateSessionUseCase(
        {
          execute: vi
            .fn()
            .mockResolvedValue({ ...identity, role: UserRole.Assistant }),
        } as unknown as VerifyCredentialsUseCase,
        {
          issue: vi.fn().mockReturnValue({ hash: 'hash', value: 'token' }),
        } as unknown as SessionTokenService,
        { getOrThrow: vi.fn().mockReturnValue(60) } as unknown as ConfigService,
        {
          transaction: vi.fn(
            async (callback: (manager: EntityManager) => Promise<boolean>) =>
              callback(manager),
          ),
        } as unknown as DataSource,
        {
          record: vi.fn().mockResolvedValue(undefined),
        } as unknown as AuditService,
      );

      const result = await useCase.execute('Encargado', 'test-only-password');

      expect(result?.expiresAt).toEqual(expected);
      expect(sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({ expiresAt: expected }),
      );
      expect(delegations.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ select: { id: true, expiresAt: true } }),
      );
    },
  );

  it('persists only the token hash with the configured expiration', async () => {
    const verifyCredentials = {
      execute: vi.fn().mockResolvedValue(identity),
    } as unknown as VerifyCredentialsUseCase;
    const issue = vi
      .fn()
      .mockReturnValue({ hash: 'a'.repeat(64), value: 'raw-session-token' });
    const tokens = {
      issue,
    } as unknown as SessionTokenService;
    const config = {
      getOrThrow: vi.fn().mockReturnValue(60),
    } as unknown as ConfigService;
    const create = vi.fn((value) => value);
    const save = vi.fn().mockResolvedValue({ id: 'session-1' });
    const sessions = {
      create,
      save,
    } as unknown as Repository<SessionEntity>;
    const manager = {
      getRepository: vi.fn().mockReturnValue(sessions),
    } as unknown as EntityManager;
    const transaction = vi.fn(
      async (callback: (entityManager: EntityManager) => Promise<void>) =>
        callback(manager),
    );
    const dataSource = { transaction } as unknown as DataSource;
    const record = vi.fn().mockResolvedValue(undefined);
    const audit = { record } as unknown as AuditService;
    const useCase = new CreateSessionUseCase(
      verifyCredentials,
      tokens,
      config,
      dataSource,
      audit,
    );

    const result = await useCase.execute('Mayorista', 'private-password');

    expect(result?.token).toBe('raw-session-token');
    expect(result?.identity).toEqual(identity);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ tokenHash: 'a'.repeat(64), userId: 'user-1' }),
    );
    expect(create).not.toHaveBeenCalledWith(
      expect.objectContaining({ token: 'raw-session-token' }),
    );
    expect(record).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({ action: 'session.created' }),
    );
    expect(result?.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('does not issue or persist a token for invalid credentials', async () => {
    const verifyCredentials = {
      execute: vi.fn().mockResolvedValue(undefined),
    } as unknown as VerifyCredentialsUseCase;
    const issue = vi.fn();
    const tokens = { issue } as unknown as SessionTokenService;
    const config = { getOrThrow: vi.fn() } as unknown as ConfigService;
    const save = vi.fn();
    const transaction = vi.fn();
    const dataSource = { transaction } as unknown as DataSource;
    const audit = { record: vi.fn() } as unknown as AuditService;
    const useCase = new CreateSessionUseCase(
      verifyCredentials,
      tokens,
      config,
      dataSource,
      audit,
    );

    await expect(useCase.execute('Unknown', 'wrong')).resolves.toBeUndefined();
    expect(issue).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it('does not issue a usable session to an assistant without an active delegation', async () => {
    const assistant = { ...identity, role: UserRole.Assistant };
    const verifyCredentials = {
      execute: vi.fn().mockResolvedValue(assistant),
    } as unknown as VerifyCredentialsUseCase;
    const tokens = {
      issue: vi.fn().mockReturnValue({ hash: 'hash', value: 'token' }),
    } as unknown as SessionTokenService;
    const config = {
      getOrThrow: vi.fn().mockReturnValue(60),
    } as unknown as ConfigService;
    const delegationRepository = { findOne: vi.fn().mockResolvedValue(null) };
    const manager = {
      getRepository: vi.fn().mockReturnValue(delegationRepository),
    } as unknown as EntityManager;
    const transaction = vi.fn(
      async (callback: (entityManager: EntityManager) => Promise<boolean>) =>
        callback(manager),
    );
    const useCase = new CreateSessionUseCase(
      verifyCredentials,
      tokens,
      config,
      { transaction } as unknown as DataSource,
      { record: vi.fn() } as unknown as AuditService,
    );

    await expect(
      useCase.execute('Encargado', 'private-password'),
    ).resolves.toBeUndefined();
    expect(delegationRepository.findOne).toHaveBeenCalledOnce();
  });
});
