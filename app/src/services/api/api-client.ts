import type {
  AuthenticatedSession,
  SessionIdentity,
} from '@/domain/auth/session';

type ApiErrorPayload = {
  code?: string;
  message?: string | string[];
  requestId?: string;
  statusCode?: number;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiConfigurationError extends Error {
  constructor() {
    super('La dirección de la API no está configurada.');
    this.name = 'ApiConfigurationError';
  }
}

export class ApiUnavailableError extends Error {
  constructor() {
    super('No se pudo conectar con el servidor.');
    this.name = 'ApiUnavailableError';
  }
}

type RequestOptions = {
  body?: unknown;
  method?: 'DELETE' | 'GET' | 'PATCH' | 'POST';
  token?: string;
};

type UnauthorizedListener = (rejectedToken: string) => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

export function subscribeToUnauthorizedResponse(listener: UnauthorizedListener) {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

export async function createSession(
  username: string,
  password: string,
): Promise<AuthenticatedSession> {
  const created = await apiRequest<Pick<AuthenticatedSession, 'accessToken' | 'expiresAt'>>('/auth/sessions', {
    body: { password, username },
    method: 'POST',
  });
  // Login returns credential identity; the authenticated endpoint supplies
  // businessName, sessionId and the central expiration needed for restoration.
  const user = await getCurrentSession(created.accessToken);
  return { accessToken: created.accessToken, expiresAt: user.expiresAt, user };
}

export async function getCurrentSession(token: string) {
  return apiRequest<SessionIdentity>('/auth/session', { token });
}

export async function revokeSession(token: string) {
  await apiRequest<void>('/auth/session', { method: 'DELETE', token });
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}) {
  const baseUrl = getApiBaseUrl();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      headers: {
        Accept: 'application/json',
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      method: options.method ?? 'GET',
      signal: controller.signal,
    });
    if (!response.ok) {
      const payload = await readErrorPayload(response);
      const message = Array.isArray(payload.message)
        ? payload.message.join(' ')
        : payload.message ?? 'La solicitud no pudo procesarse.';
      if (response.status === 401 && options.token) {
        for (const listener of unauthorizedListeners) listener(options.token);
      }
      throw new ApiError(message, response.status, payload.code, payload.requestId);
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError || error instanceof ApiConfigurationError) throw error;
    throw new ApiUnavailableError();
  } finally {
    clearTimeout(timeout);
  }
}

export function getApiBaseUrl() {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!configured) throw new ApiConfigurationError();
  return configured.replace(/\/+$/, '');
}

async function readErrorPayload(response: Response): Promise<ApiErrorPayload> {
  try {
    return (await response.json()) as ApiErrorPayload;
  } catch {
    return { statusCode: response.status };
  }
}
