import { useRouter } from 'expo-router';

import { useSession } from '@/features/auth/session/session-provider';
import { modulesFor } from '@/features/home/menu-modules';
import { HomeScreen } from '@/features/home/screens/home-screen';

export default function HomeRoute() {
  const router = useRouter();
  const { logout, session } = useSession();
  if (!session) return null;
  const isWholesaler = session.user.role === 'wholesaler';
  return (
    <HomeScreen
      modules={modulesFor(session.user.role)}
      onOpenModule={(module) => router.push(module.route)}
      onLogout={() => void logout()}
      roleLabel={isWholesaler ? 'Mayorista' : 'Encargado con reemplazo vigente'}
      userDisplayName={session.user.username}
    />
  );
}
