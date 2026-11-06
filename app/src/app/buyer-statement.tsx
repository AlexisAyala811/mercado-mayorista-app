import { useLocalSearchParams, useRouter } from 'expo-router';

import { BuyerStatementScreen } from '@/features/accounts/screens/buyer-statement-screen';
import { WholesalerRoute } from '@/features/auth/authorization/wholesaler-route';
import { backOrHome } from '@/navigation/back-or-home';

// Spec 009 (T942): only the Wholesaler opens a buyer's statement.
export default function BuyerStatementRoute() {
  const router = useRouter();
  const { buyerId } = useLocalSearchParams<{ buyerId?: string | string[] }>();
  const id = Array.isArray(buyerId) ? buyerId[0] : buyerId;
  return <WholesalerRoute>{id ? <BuyerStatementScreen key={id} buyerId={id} onBack={() => backOrHome(router)} /> : null}</WholesalerRoute>;
}
