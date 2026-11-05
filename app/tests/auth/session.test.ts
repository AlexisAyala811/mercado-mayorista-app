import {
  isSessionExpired,
  parseStoredSession,
  type AuthenticatedSession,
} from '../../src/domain/auth/session';

const session: AuthenticatedSession = {
  accessToken: 'opaque-token',
  expiresAt: '2026-10-01T12:00:00.000Z',
  user: {
    businessId: 'business-id',
    businessName: 'Mercado Central',
    expiresAt: '2026-10-01T12:00:00.000Z',
    role: 'wholesaler',
    sessionId: 'session-id',
    userId: 'user-id',
    username: 'mayorista',
  },
};

describe('authenticated session', () => {
  it('restores a complete stored session and rejects malformed values', () => {
    expect(parseStoredSession(JSON.stringify(session))).toEqual(session);
    expect(parseStoredSession('{invalid')).toBeNull();
    expect(parseStoredSession(JSON.stringify({ accessToken: 'only-token' }))).toBeNull();
  });

  it('expires the session at the exact central expiration instant', () => {
    expect(isSessionExpired(session, Date.parse('2026-10-01T11:59:59.999Z'))).toBe(false);
    expect(isSessionExpired(session, Date.parse(session.expiresAt))).toBe(true);
  });
});
