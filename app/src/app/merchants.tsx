import { MerchantsScreen } from '@/features/merchants/screens/merchants-screen';

// Spec 023: reachable only by the Administrator (see the guards in _layout).
export default function MerchantsRoute() {
  return <MerchantsScreen />;
}
