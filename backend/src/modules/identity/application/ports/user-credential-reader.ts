import type { UserRole } from '../../entities/user.entity.js';

export type StoredUserCredential = {
  businessId: string;
  id: string;
  /** Spec 023: set after a temporary password from the Administrator. */
  mustChangePassword?: boolean;
  passwordHash: string;
  role: UserRole;
  username: string;
};

export abstract class UserCredentialReader {
  /** An active user of an active (not suspended) business. */
  abstract findActiveByUsername(
    username: string,
  ): Promise<StoredUserCredential | undefined>;

  /** Spec 023: counts a wrong password, for account support. */
  recordFailedLogin(_userId: string): Promise<void> {
    return Promise.resolve();
  }
}
