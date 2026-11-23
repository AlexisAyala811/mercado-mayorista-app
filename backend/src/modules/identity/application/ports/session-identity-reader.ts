import type { UserRole } from '../../entities/user.entity.js';

export type SessionIdentity = {
  businessId: string;
  businessName: string;
  expiresAt: Date;
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
