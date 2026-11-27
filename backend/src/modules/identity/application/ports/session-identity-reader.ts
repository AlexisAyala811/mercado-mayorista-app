import type { UserRole } from '../../entities/user.entity.js';

export type SessionIdentity = {
  businessId: string;
  businessName: string;
  expiresAt: Date;
  /** Spec 023: while true, only the password change is allowed. */
  mustChangePassword?: boolean;
  role: UserRole;
  sessionId: string;
  userId: string;
  username: string;
};

export abstract class SessionIdentityReader {
  abstract findActiveByTokenHash(
    tokenHash: string,
  ): Promise<SessionIdentity | undefined>;
}
