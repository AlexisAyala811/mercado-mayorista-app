import type { UserRole } from '../../entities/user.entity.js';

export type StoredUserCredential = {
  businessId: string;
  id: string;
  passwordHash: string;
  role: UserRole;
  username: string;
};

export abstract class UserCredentialReader {
  abstract findActiveByUsername(
    username: string,
  ): Promise<StoredUserCredential | undefined>;
}
