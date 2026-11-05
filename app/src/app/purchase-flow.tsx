import { PurchaseFlowScreen } from '@/features/reception/screens/purchase-flow-screen';
import { PurchaseVisualTheme } from '@/ui/visual-theme';
import { useLocalSearchParams } from 'expo-router';

export default function PurchaseFlowRoute() {
  const { receptionId } = useLocalSearchParams<{ receptionId?: string | string[] }>();
  const id = Array.isArray(receptionId) ? receptionId[0] : receptionId;
  return <PurchaseVisualTheme><PurchaseFlowScreen key={id ?? 'new'} initialReceptionId={id} /></PurchaseVisualTheme>;
}
