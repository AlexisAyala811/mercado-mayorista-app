import { AppScreen, FeedbackState } from '@/ui/components';
// Reserved historical feature. Public routes redirect to the menu.
export function InventoryScreen() {
  return <AppScreen><FeedbackState title="Función retirada" message="El sistema conserva operaciones comerciales sin calcular existencias." tone="neutral" /></AppScreen>;
}
