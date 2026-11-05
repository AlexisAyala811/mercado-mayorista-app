import { LoginScreen } from '@/features/auth/screens/login-screen';
import { useSession } from '@/features/auth/session/session-provider';

export default function LoginRoute() {
  const { isSubmitting, login, loginError, hasPendingSessionRemoval, isClearingLocalSession, retrySessionRemoval } = useSession();
  return (
    <LoginScreen
      errorMessage={loginError}
      isSubmitting={isSubmitting}
      hasPendingSessionRemoval={hasPendingSessionRemoval}
      isClearingLocalSession={isClearingLocalSession}
      onRetrySessionRemoval={() => void retrySessionRemoval()}
      onSubmit={(credentials) => void login(credentials)}
    />
  );
}
