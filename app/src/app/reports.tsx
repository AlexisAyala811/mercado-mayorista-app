import { useLocalSearchParams } from 'expo-router';

import { WholesalerRoute } from '@/features/auth/authorization/wholesaler-route';
import { ReportsScreen } from '@/features/reports/screens/reports-screen';

// Spec 011 (RQ-ST11): the Venta side of the menu opens the sales report.
export default function ReportsRoute() {
  const { lado } = useLocalSearchParams<{ lado?: string }>();
  return (
    <WholesalerRoute>
      <ReportsScreen initialOperation={lado === 'venta' ? 'sale' : 'purchase'} />
    </WholesalerRoute>
  );
}
