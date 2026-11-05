import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

import {
  isSessionExpired,
  parseStoredSession,
  type AuthenticatedSession,
} from "@/domain/auth/session";
import {
  ApiError,
  ApiUnavailableError,
  createSession,
  getCurrentSession,
  revokeSession,
  subscribeToUnauthorizedResponse,
} from "@/services/api/api-client";
import {
  clearStoredSession,
  readStoredSession,
  writeStoredSession,
} from "@/services/storage/session-storage";

import { createSerialExecutor } from "@/domain/sync/serial-executor";

type SessionContextValue = {
  bootstrapError: string | null;
  isOfflineSession: boolean;
  isBootstrapping: boolean;
  isRevalidating: boolean;
  isSubmitting: boolean;
  isClearingLocalSession: boolean;
  hasPendingSessionRemoval: boolean;
  retrySessionRemoval: () => Promise<void>;
  login: (credentials: { password: string; username: string }) => Promise<void>;
  loginError: string | null;
  logout: () => Promise<void>;
  invalidateSession: () => Promise<void>;
  retryBootstrap: () => void;
  session: AuthenticatedSession | null;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthenticatedSession | null>(null);
  const currentSession = useRef<AuthenticatedSession | null>(null);
  const generation = useRef(0);
  const pendingSessionRemoval = useRef(false);
  const [hasPendingSessionRemoval, setHasPendingSessionRemoval] = useState(false);
  const [isClearingLocalSession, setIsClearingLocalSession] = useState(false);
  const storage = useRef(createSerialExecutor());
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isRevalidating, setIsRevalidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [isOfflineSession, setIsOfflineSession] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0);
  const commitSession = useCallback((next: AuthenticatedSession | null) => {
    currentSession.current = next;
    setSession(next);
  }, []);
  const removeSession = useCallback(
    async (message: string | null = null) => {
      const request = ++generation.current;
      pendingSessionRemoval.current = true;
      setHasPendingSessionRemoval(true);
      setIsClearingLocalSession(true);
      commitSession(null);
      setIsOfflineSession(false);
      setIsBootstrapping(false);
      setIsRevalidating(false);
      setIsSubmitting(false);
      setBootstrapError(null);
      setLoginError(message);
      try {
        await storage.current(clearStoredSession);
        if (request === generation.current) {
          pendingSessionRemoval.current = false;
          setHasPendingSessionRemoval(false);
        }
      } catch (error) {
        if (request === generation.current)
          setLoginError(
            "No se pudo retirar la sesión del dispositivo. Reintenta el cierre antes de usarlo sin conexión.",
          );
        throw error;
      } finally {
        if (request === generation.current) setIsClearingLocalSession(false);
      }
    },
    [commitSession],
  );

  useEffect(() => {
    let active = true;
    const request = ++generation.current;
    const ownsRequest = () => active && request === generation.current;
    async function bootstrap() {
      setIsBootstrapping(!currentSession.current);
      setIsRevalidating(Boolean(currentSession.current));
      setBootstrapError(null);
      let stored: AuthenticatedSession | null = null;
      try {
        if (pendingSessionRemoval.current) {
          await removeSession();
          return;
        }
        stored = await storage.current(readStoredSession);
        if (!ownsRequest()) return;
        if (!stored || isSessionExpired(stored)) {
          await removeSession(
            stored
              ? "Tu sesión venció. Ingresa nuevamente para continuar."
              : null,
          );
          return;
        }
        const user = await getCurrentSession(stored.accessToken);
        if (!ownsRequest()) return;
        if (
          isSessionExpired(stored) ||
          user.businessId !== stored.user.businessId ||
          user.userId !== stored.user.userId ||
          user.sessionId !== stored.user.sessionId
        )
          throw new ApiError("La sesión ya no es válida.", 401);
        const refreshed = { ...stored, expiresAt: user.expiresAt, user };
        if (!parseStoredSession(JSON.stringify(refreshed)) || isSessionExpired(refreshed))
          throw new ApiError("La sesión venció.", 401);
        await storage.current(async () => {
          if (ownsRequest()) await writeStoredSession(refreshed);
        });
        if (ownsRequest() && isSessionExpired(refreshed)) {
          await removeSession(
            "Tu sesión venció. Ingresa nuevamente para continuar.",
          );
        } else if (ownsRequest()) {
          commitSession(refreshed);
          setIsOfflineSession(false);
        }
      } catch (error) {
        if (!ownsRequest()) return;
        if (error instanceof ApiError && error.status === 401) {
          await removeSession(
            "Tu sesión venció. Ingresa nuevamente para continuar.",
          ).catch(() => undefined);
        } else if (
          error instanceof ApiUnavailableError &&
          stored &&
          !isSessionExpired(stored)
        ) {
          commitSession(stored);
          setIsOfflineSession(true);
        } else setBootstrapError(messageForConnectionError(error));
      } finally {
        if (ownsRequest()) {
          setIsBootstrapping(false);
          setIsRevalidating(false);
        }
      }
    }
    void bootstrap();
    return () => {
      active = false;
    };
  }, [bootstrapAttempt, commitSession, removeSession]);

  useEffect(() => {
    if (!session) return;
    const timer = setTimeout(
      () => {
        void removeSession(
          "Tu sesión venció. Ingresa nuevamente para continuar.",
        ).catch(() =>
          setLoginError(
            "Tu sesión venció. No se pudo retirar su copia local; vuelve a intentar el cierre.",
          ),
        );
      },
      Math.max(0, Date.parse(session.expiresAt) - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [session, removeSession]);
  useEffect(
    () =>
      subscribeToUnauthorizedResponse((rejectedToken) => {
        if (currentSession.current?.accessToken !== rejectedToken) return;
        void removeSession(
          "Tu sesión venció. Ingresa nuevamente para continuar.",
        ).catch(() =>
          setLoginError(
            "No se pudo retirar la copia local de la sesión rechazada.",
          ),
        );
      }),
    [removeSession],
  );

  const login = useCallback(
    async (credentials: { password: string; username: string }) => {
      if (pendingSessionRemoval.current) {
        setLoginError("Reintenta el cierre para retirar la sesión anterior antes de ingresar.");
        return;
      }
      const request = ++generation.current;
      setIsSubmitting(true);
      setLoginError(null);
      setBootstrapError(null);
      setIsBootstrapping(false);
      setIsRevalidating(false);
      try {
        const created = await createSession(
          credentials.username,
          credentials.password,
        );
        if (request !== generation.current) return;
        if (!parseStoredSession(JSON.stringify(created)) || isSessionExpired(created))
          throw new ApiError("La sesión recibida ya venció.", 401);
        await storage.current(async () => {
          if (request === generation.current) await writeStoredSession(created);
        });
        if (request === generation.current && isSessionExpired(created)) {
          await removeSession(
            "Tu sesión venció. Ingresa nuevamente para continuar.",
          );
        } else if (request === generation.current) {
          setLoginError(null);
          setIsOfflineSession(false);
          commitSession(created);
        }
      } catch (error) {
        if (request === generation.current)
          setLoginError(messageForLoginError(error));
      } finally {
        if (request === generation.current) setIsSubmitting(false);
      }
    },
    [commitSession, removeSession],
  );
  const logout = useCallback(async () => {
    const current = currentSession.current;
    try {
      await removeSession();
    } catch {
      // removeSession exposes the failed local removal in the login screen.
    } finally {
      if (current) {
        try {
          await revokeSession(current.accessToken);
        } catch {
          /* The local removal result remains visible; central TTL still applies. */
        }
      }
    }
  }, [removeSession]);
  const invalidateSession = useCallback(async () => {
    try {
      await removeSession();
    } catch {
      /* Local removal failure remains visible. */
    }
  }, [removeSession]);
  const retrySessionRemoval = useCallback(async () => {
    try {
      await removeSession();
    } catch {
      /* Keep the failure and retry action visible until local removal succeeds. */
    }
  }, [removeSession]);
  const value = useMemo<SessionContextValue>(
    () => ({
      bootstrapError,
      isOfflineSession,
      isBootstrapping,
      isRevalidating,
      isSubmitting,
      isClearingLocalSession,
      hasPendingSessionRemoval,
      retrySessionRemoval,
      login,
      invalidateSession,
      loginError,
      logout,
      retryBootstrap: () => setBootstrapAttempt((value) => value + 1),
      session,
    }),
    [
      bootstrapError,
      isOfflineSession,
      isBootstrapping,
      isRevalidating,
      isSubmitting,
      isClearingLocalSession,
      hasPendingSessionRemoval,
      retrySessionRemoval,
      login,
      invalidateSession,
      loginError,
      logout,
      session,
    ],
  );
  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value)
    throw new Error("useSession debe usarse dentro de SessionProvider.");
  return value;
}

function messageForLoginError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Usuario o contraseña no válidos.";
    if (error.status === 429)
      return "Se alcanzó el límite de intentos. Espera un minuto y vuelve a intentar.";
    if (error.status >= 500)
      return "El servidor no pudo completar el acceso. Intenta nuevamente.";
    return error.message;
  }
  return messageForConnectionError(error);
}

function messageForConnectionError(error: unknown) {
  if (error instanceof ApiUnavailableError) {
    return "No se pudo conectar con el servidor. Revisa la conexión e intenta nuevamente.";
  }
  return error instanceof Error
    ? error.message
    : "No se pudo recuperar la sesión.";
}
