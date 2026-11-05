export type UserRole = 'assistant' | 'wholesaler';

export type SessionIdentity = {
  businessId: string;
  businessName: string;
  expiresAt: string;
  role: UserRole;
  sessionId: string;
  userId: string;
  username: string;
};

export type AuthenticatedSession = {
  accessToken: string;
  expiresAt: string;
  user: SessionIdentity;
};

export function isSessionExpired(session: AuthenticatedSession, now = Date.now()) {
  const expiresAt = Date.parse(session.expiresAt);
  return !Number.isFinite(expiresAt) || expiresAt <= now;
}

export function parseStoredSession(value: string | null): AuthenticatedSession | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<AuthenticatedSession>;
    if (
      typeof parsed.accessToken !== 'string' ||
      typeof parsed.expiresAt !== 'string' ||
      !parsed.user ||
      typeof parsed.user.businessId !== 'string' ||
      typeof parsed.user.businessName !== 'string' ||
      typeof parsed.user.sessionId !== 'string' ||
      typeof parsed.user.userId !== 'string' ||
      typeof parsed.user.username !== 'string' ||
      (parsed.user.role !== 'assistant' && parsed.user.role !== 'wholesaler')
    ) {
      return null;
    }
    return parsed as AuthenticatedSession;
  } catch {
    return null;
  }
}
