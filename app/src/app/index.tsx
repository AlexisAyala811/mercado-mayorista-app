import { LoginScreen } from '@/features/auth/screens/login-screen';
import { useSession } from '@/features/auth/session/session-provider';
import { useRecentOperators } from '@/features/auth/session/use-recent-operators';

export default function LoginRoute() {
  const { isSubmitting, login, loginError, hasPendingSessionRemoval, isClearingLocalSession, retrySessionRemoval } = useSession();
  const operators = useRecentOperators();
  return (
    <LoginScreen
      errorMessage={loginError}
      isSubmitting={isSubmitting}
      hasPendingSessionRemoval={hasPendingSessionRemoval}
      isClearingLocalSession={isClearingLocalSession}
      onRetrySessionRemoval={() => void retrySessionRemoval()}
      onSubmit={(credentials, options) => void login(credentials, options)}
      operators={operators}
    />
  );
}
