import { Redirect } from 'expo-router';

// Keep the historical URL harmless; stock management is outside the approved scope.
export default function RetiredInventoryRoute() {
  return <Redirect href="/home" />;
}
