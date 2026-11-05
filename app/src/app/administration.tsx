import { AdministrationScreen } from '@/features/administration/screens/administration-screen';
import { WholesalerRoute } from '@/features/auth/authorization/wholesaler-route';

export default function AdministrationRoute() {
  return <WholesalerRoute><AdministrationScreen /></WholesalerRoute>;
}
