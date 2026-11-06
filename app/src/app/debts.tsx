import { AccountsScreen } from '@/features/accounts/screens/accounts-screen';
import { WholesalerRoute } from '@/features/auth/authorization/wholesaler-route';

// Spec 011 (CL-FM18): Deudas a proveedores.
export default function DebtsRoute() { return <WholesalerRoute><AccountsScreen kind="payable" /></WholesalerRoute>; }
