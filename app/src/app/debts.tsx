import { useLocalSearchParams } from 'expo-router';

import { AccountsScreen } from '@/features/accounts/screens/accounts-screen';
import { WholesalerRoute } from '@/features/auth/authorization/wholesaler-route';

// Spec 011 (CL-FM18): Deudas a proveedores. ?sourceId= opens the account of a
// settlement or sale from Ver compras / Ver ventas (RQ-ST05).
export default function DebtsRoute() {
  const { sourceId } = useLocalSearchParams<{ sourceId?: string | string[] }>();
  const source = Array.isArray(sourceId) ? sourceId[0] : sourceId;
  return <WholesalerRoute><AccountsScreen kind="payable" openSourceId={source || undefined} /></WholesalerRoute>;
}
