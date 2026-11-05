import { useEffect } from 'react';
import { useSession } from '@/features/auth/session/session-provider';
import { clearInitialPurchaseDraft } from '@/domain/reception/initial-purchase-draft';

export function useInitialPurchaseDraftSession() {
  const { session } = useSession();
  const owner = session?.accessToken;
  useEffect(() => {
    if (!owner) clearInitialPurchaseDraft();
    return () => clearInitialPurchaseDraft(owner);
  }, [owner]);
}
