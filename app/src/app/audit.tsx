import { AuditScreen } from '@/features/administration/screens/audit-screen';
import { WholesalerRoute } from '@/features/auth/authorization/wholesaler-route';

export default function AuditRoute() {
  return <WholesalerRoute><AuditScreen /></WholesalerRoute>;
}
