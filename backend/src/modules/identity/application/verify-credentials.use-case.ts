import { Injectable } from '@nestjs/common';

import { UserCredentialReader } from './ports/user-credential-reader.js';
import type { UserRole } from '../entities/user.entity.js';
import { PasswordHasher } from '../security/password-hasher.js';

export type VerifiedIdentity = {
  businessId: string;
  role: UserRole;
  userId: string;
  username: string;
};

@Injectable()
export class VerifyCredentialsUseCase {
  constructor(
    private readonly users: UserCredentialReader,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(
    username: string,
    password: string,
  ): Promise<VerifiedIdentity | undefined> {
    const normalizedUsername = username.trim();
    if (!normalizedUsername || !password) return undefined;

    const user = await this.users.findActiveByUsername(normalizedUsername);
    if (!user) {
      await this.passwordHasher.hash(password);
      return undefined;
    }

    const isValid = await this.passwordHasher.verify(
      password,
      user.passwordHash,
    );
    if (!isValid) return undefined;

    return {
      businessId: user.businessId,
      role: user.role,
      userId: user.id,
      username: user.username,
    };
  }
}
