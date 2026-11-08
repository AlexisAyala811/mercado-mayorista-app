import { useLocalSearchParams } from 'expo-router';

import { BuyerStatementScreen } from '@/features/accounts/screens/buyer-statement-screen';
import { WholesalerRoute } from '@/features/auth/authorization/wholesaler-route';

// Spec 009 (T942): only the Wholesaler opens a buyer's statement. «Atrás» of
// the bottom bar (spec 011, RQ-ST02) returns to Cobranzas.
export default function BuyerStatementRoute() {
  const { buyerId } = useLocalSearchParams<{ buyerId?: string | string[] }>();
  const id = Array.isArray(buyerId) ? buyerId[0] : buyerId;
  return <WholesalerRoute>{id ? <BuyerStatementScreen key={id} buyerId={id} /> : null}</WholesalerRoute>;
}
