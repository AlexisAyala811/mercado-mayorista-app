import { useLocalSearchParams } from 'expo-router';

import { SaleFlowScreen } from '@/features/sales/screens/sale-flow-screen';

// ?nueva= starts a new sale after a confirmed one (spec 011, RQ-ST04).
export default function SaleFlowRoute() {
  const { nueva } = useLocalSearchParams<{ nueva?: string | string[] }>();
  const fresh = Array.isArray(nueva) ? nueva[0] : nueva;
  return <SaleFlowScreen key={fresh ?? 'new'} />;
}
