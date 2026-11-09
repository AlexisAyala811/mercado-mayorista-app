import { PurchaseFlowScreen } from '@/features/reception/screens/purchase-flow-screen';
import { PurchaseVisualTheme } from '@/ui/visual-theme';
import { useLocalSearchParams } from 'expo-router';

export default function PurchaseFlowRoute() {
  // ?nueva= starts a new purchase after a confirmed one (spec 011, RQ-ST04).
  const { receptionId, nueva } = useLocalSearchParams<{ receptionId?: string | string[]; nueva?: string | string[] }>();
  const id = Array.isArray(receptionId) ? receptionId[0] : receptionId;
  const fresh = Array.isArray(nueva) ? nueva[0] : nueva;
  return <PurchaseVisualTheme><PurchaseFlowScreen key={id ?? `new-${fresh ?? ''}`} initialReceptionId={id} /></PurchaseVisualTheme>;
}
