import type { StoredUserCredential } from './ports/user-credential-reader.js';
import { UserCredentialReader } from './ports/user-credential-reader.js';
import { VerifyCredentialsUseCase } from './verify-credentials.use-case.js';
import { UserRole } from '../entities/user.entity.js';
import { PasswordHasher } from '../security/password-hasher.js';

class InMemoryUserCredentialReader extends UserCredentialReader {
  constructor(private readonly user?: StoredUserCredential) {
    super();
  }

  findActiveByUsername(username: string) {
    return Promise.resolve(
      this.user?.username.toLocaleLowerCase() === username.toLocaleLowerCase()
        ? this.user
        : undefined,
    );
  }
}

describe('VerifyCredentialsUseCase', () => {
  const hasher = new PasswordHasher();

  it('returns only the public identity for valid credentials', async () => {
    const passwordHash = await hasher.hash('correct-password');
    const reader = new InMemoryUserCredentialReader({
      businessId: 'business-1',
      id: 'user-1',
      passwordHash,
      role: UserRole.Wholesaler,
      username: 'Mayorista',
    });
    const useCase = new VerifyCredentialsUseCase(reader, hasher);

    await expect(
      useCase.execute('  mayorista  ', 'correct-password'),
    ).resolves.toEqual({
      businessId: 'business-1',
      role: UserRole.Wholesaler,
      userId: 'user-1',
      username: 'Mayorista',
    });
  });

  it('returns the same empty result for unknown users and incorrect passwords', async () => {
    const passwordHash = await hasher.hash('correct-password');
    const knownReader = new InMemoryUserCredentialReader({
      businessId: 'business-1',
      id: 'user-1',
      passwordHash,
      role: UserRole.Assistant,
      username: 'Encargado',
    });

    await expect(
      new VerifyCredentialsUseCase(knownReader, hasher).execute(
        'Encargado',
        'wrong',
      ),
    ).resolves.toBeUndefined();
    await expect(
      new VerifyCredentialsUseCase(
        new InMemoryUserCredentialReader(),
        hasher,
      ).execute('Unknown', 'wrong'),
    ).resolves.toBeUndefined();
  });
});
