import { MessagingScreen } from '@/features/messaging/messaging-screen';
import { WholesalerRoute } from '@/features/auth/authorization/wholesaler-route';
import { useSession } from '@/features/auth/session/session-provider';
export default function MessagingRoute() {
  const { session } = useSession();
  return <WholesalerRoute><MessagingScreen key={session?.accessToken} /></WholesalerRoute>;
}
