import type { ConfigService } from '@nestjs/config';
import type { DataSource, EntityManager, Repository } from 'typeorm';

import type { AuditService } from '../../../shared/audit/audit.service.js';
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
  afterEach(() => jest.useRealTimers());
  const identity: VerifiedIdentity = {
    businessId: 'business-1',
    role: UserRole.Wholesaler,
    userId: 'user-1',
    username: 'Mayorista',
  };

  it.each([15, 120])(
    'bounds the persisted and returned assistant session by a %i minute replacement',
    async (replacementMinutes) => {
      jest.useFakeTimers();
      const now = new Date('2026-10-08T15:00:00.000Z');
      jest.setSystemTime(now);
      const replacementExpiresAt = new Date(
        now.getTime() + replacementMinutes * 60_000,
      );
      const expected = new Date(
        now.getTime() + Math.min(60, replacementMinutes) * 60_000,
      );
      const delegations = {
        findOne: jest
          .fn()
          .mockResolvedValue({
            id: 'replacement-1',
            expiresAt: replacementExpiresAt,
          }),
      };
      const sessions = {
        create: jest.fn((value) => value),
        save: jest.fn().mockResolvedValue({ id: 'session-1' }),
      };
      const manager = {
        getRepository: jest.fn((entity) =>
          entity === DelegationEntity ? delegations : sessions,
        ),
      } as unknown as EntityManager;
      const useCase = new CreateSessionUseCase(
        {
          execute: jest
            .fn()
            .mockResolvedValue({ ...identity, role: UserRole.Assistant }),
        } as unknown as VerifyCredentialsUseCase,
        {
          issue: jest.fn().mockReturnValue({ hash: 'hash', value: 'token' }),
        } as unknown as SessionTokenService,
        { getOrThrow: jest.fn().mockReturnValue(60) } as unknown as ConfigService,
        {
          transaction: jest.fn(
            async (callback: (manager: EntityManager) => Promise<boolean>) =>
              callback(manager),
          ),
        } as unknown as DataSource,
        {
          record: jest.fn().mockResolvedValue(undefined),
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
      execute: jest.fn().mockResolvedValue(identity),
    } as unknown as VerifyCredentialsUseCase;
    const issue = jest
      .fn()
      .mockReturnValue({ hash: 'a'.repeat(64), value: 'raw-session-token' });
    const tokens = {
      issue,
    } as unknown as SessionTokenService;
    const config = {
      getOrThrow: jest.fn().mockReturnValue(60),
    } as unknown as ConfigService;
    const create = jest.fn((value) => value);
    const save = jest.fn().mockResolvedValue({ id: 'session-1' });
    const sessions = {
      create,
      save,
    } as unknown as Repository<SessionEntity>;
    const manager = {
      getRepository: jest.fn().mockReturnValue(sessions),
    } as unknown as EntityManager;
    const transaction = jest.fn(
      async (callback: (entityManager: EntityManager) => Promise<void>) =>
        callback(manager),
    );
    const dataSource = { transaction } as unknown as DataSource;
    const record = jest.fn().mockResolvedValue(undefined);
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
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as VerifyCredentialsUseCase;
    const issue = jest.fn();
    const tokens = { issue } as unknown as SessionTokenService;
    const config = { getOrThrow: jest.fn() } as unknown as ConfigService;
    const save = jest.fn();
    const transaction = jest.fn();
    const dataSource = { transaction } as unknown as DataSource;
    const audit = { record: jest.fn() } as unknown as AuditService;
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
      execute: jest.fn().mockResolvedValue(assistant),
    } as unknown as VerifyCredentialsUseCase;
    const tokens = {
      issue: jest.fn().mockReturnValue({ hash: 'hash', value: 'token' }),
    } as unknown as SessionTokenService;
    const config = {
      getOrThrow: jest.fn().mockReturnValue(60),
    } as unknown as ConfigService;
    const delegationRepository = { findOne: jest.fn().mockResolvedValue(null) };
    const manager = {
      getRepository: jest.fn().mockReturnValue(delegationRepository),
    } as unknown as EntityManager;
    const transaction = jest.fn(
      async (callback: (entityManager: EntityManager) => Promise<boolean>) =>
        callback(manager),
    );
    const useCase = new CreateSessionUseCase(
      verifyCredentials,
      tokens,
      config,
      { transaction } as unknown as DataSource,
      { record: jest.fn() } as unknown as AuditService,
    );

    await expect(
      useCase.execute('Encargado', 'private-password'),
    ).resolves.toBeUndefined();
    expect(delegationRepository.findOne).toHaveBeenCalledTimes(1);
  });
});
