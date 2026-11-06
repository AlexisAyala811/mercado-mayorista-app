import { AccountsScreen } from '@/features/accounts/screens/accounts-screen';
import { WholesalerRoute } from '@/features/auth/authorization/wholesaler-route';

// Spec 011 (CL-FM18): Cobranzas a compradores.
export default function CollectionsRoute() { return <WholesalerRoute><AccountsScreen kind="receivable" /></WholesalerRoute>; }
