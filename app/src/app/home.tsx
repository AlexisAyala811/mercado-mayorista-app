import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';

import { useSession } from '@/features/auth/session/session-provider';
import { useMenuFacts } from '@/features/home/menu-facts';
import { modulesFor } from '@/features/home/menu-modules';
import { HomeScreen } from '@/features/home/screens/home-screen';
import { useSyncQueue } from '@/features/sync/sync-queue-provider';

export default function HomeRoute() {
  const router = useRouter();
  const { logout, session } = useSession();
  const { pendingCount } = useSyncQueue();
  const role = session?.user.role;
  const modules = useMemo(() => (role ? modulesFor(role) : []), [role]);
  const ids = useMemo(() => modules.map((module) => module.id), [modules]);
  // Spec 011 (RQ-ST01, CL-ST08): the live lines are read again every time the menu is shown.
  const { facts, reload } = useMenuFacts(session?.accessToken ?? null, ids, pendingCount);
  useFocusEffect(useCallback(() => reload(), [reload]));
  if (!session) return null;
  const isWholesaler = session.user.role === 'wholesaler';
  return (
    <HomeScreen
      facts={facts}
      modules={modules}
      onOpenModule={(module) => router.push(module.route)}
      onLogout={() => void logout()}
      roleLabel={isWholesaler ? 'Mayorista' : 'Encargado con reemplazo vigente'}
      userDisplayName={session.user.username}
    />
  );
}
