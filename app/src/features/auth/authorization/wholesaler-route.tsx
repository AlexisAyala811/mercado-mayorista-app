import { useRouter } from 'expo-router';
import type { PropsWithChildren } from 'react';

import { useSession } from '@/features/auth/session/session-provider';
import { AppScreen, FeedbackState } from '@/ui/components';

import { isWholesaler } from './permissions';

export function WholesalerRoute({ children }: PropsWithChildren) {
  const router = useRouter();
  const { session } = useSession();

  if (!session) return null;
  if (isWholesaler(session.user.role)) return children;

  return (
    <AppScreen contentContainerStyle={{ justifyContent: 'center' }} scrollable={false}>
      <FeedbackState
        actionLabel="Volver al menú"
        message="Tu perfil permite registrar compras y ventas durante un reemplazo vigente. Esta sección requiere acceso de Mayorista."
        onAction={() => router.replace('/home')}
        title="Acceso restringido"
        tone="error"
      />
    </AppScreen>
  );
}
