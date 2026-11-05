import { createSession, getCurrentSession, subscribeToUnauthorizedResponse } from '../../src/services/api/api-client';
import { parseStoredSession } from '../../src/domain/auth/session';

describe('identity API client', () => {
  const originalUrl = process.env.EXPO_PUBLIC_API_URL;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000/api/v1/';
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env.EXPO_PUBLIC_API_URL = originalUrl;
  });

  it('creates a session using the versioned contract without retaining credentials', async () => {
    const payload = {
      accessToken: 'opaque-token',
      expiresAt: '2026-10-01T12:00:00.000Z',
      user: {
        businessId: 'business',
        businessName: 'Mercado',
        expiresAt: '2026-10-01T12:00:00.000Z',
        role: 'wholesaler',
        sessionId: 'session',
        userId: 'user',
        username: 'mayorista',
      },
    };
    const loginResponse = {
      accessToken: payload.accessToken,
      expiresAt: payload.expiresAt,
      user: { businessId: 'business', role: 'wholesaler', userId: 'user', username: 'mayorista' },
    };
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify(loginResponse), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(payload.user), { status: 200 }));

    const created = await createSession('mayorista', 'secreto');
    expect(created).toEqual(payload);
    expect(parseStoredSession(JSON.stringify(created))).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/auth/sessions',
      expect.objectContaining({
        body: JSON.stringify({ password: 'secreto', username: 'mayorista' }),
        method: 'POST',
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(2,
      'http://localhost:3000/api/v1/auth/session',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer opaque-token' }) }),
    );
  });

  it('does not expose a restorable session when central identity cannot be loaded', async () => {
    jest.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ accessToken: 'opaque-token', expiresAt: '2026-10-01T12:00:00.000Z', user: {} }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'No disponible.' }), { status: 503 }));
    await expect(createSession('mayorista', 'secreto')).rejects.toMatchObject({ status: 503 });
  });

  it('sends the opaque bearer token and preserves the server request id on errors', async () => {
    const onUnauthorized = jest.fn();
    const unsubscribe = subscribeToUnauthorizedResponse(onUnauthorized);
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          message: 'Sesión no válida.',
          requestId: 'request-123',
          statusCode: 401,
        }),
        { status: 401 },
      ),
    );
    await expect(getCurrentSession('opaque-token')).rejects.toMatchObject({
      message: 'Sesión no válida.',
      requestId: 'request-123',
      status: 401,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/auth/session',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer opaque-token' }),
      }),
    );
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).toHaveBeenCalledWith('opaque-token');
    unsubscribe();
  });

  it('does not expire an existing session when login credentials are rejected', async () => {
    const onUnauthorized = jest.fn();
    const unsubscribe = subscribeToUnauthorizedResponse(onUnauthorized);
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'Credenciales no válidas.' }), { status: 401 }),
    );

    await expect(createSession('mayorista', 'incorrecta')).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).not.toHaveBeenCalled();
    unsubscribe();
  });
});
