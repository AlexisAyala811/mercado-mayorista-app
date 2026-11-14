import { StyleSheet } from 'react-native';

import type { PurchaseSettlement } from '@/domain/reception/reception';
import { purchaseConfirmationSummary } from '@/domain/shared/confirmation-summary';
import { ConfirmationCard } from '@/features/receipts/components/confirmation-card';
import { AppScreen } from '@/ui/components';
import { AppHeader } from '@/ui/navigation/app-header';
import { spacing } from '@/ui/tokens';

type Props = { onNew: () => void; providerName: string; settlement: PurchaseSettlement };

// Spec 011 (RQ-ST04, CL-ST18): the Stitch «Guardado exitosamente» screen for
// a purchase: the header and one card with the confirmed liquidation.
export function PurchaseConfirmationScreen({ onNew, providerName, settlement }: Props) {
  return (
    <AppScreen contentContainerStyle={styles.screen} testID="purchase-confirmation-screen">
      <AppHeader eyebrow="COMPRA" subtitle="Recepción y pesaje confirmados" title="Compra" />
      <ConfirmationCard documentLabel="LIQUIDACIÓN DE COMPRA" title="La compra" party={providerName} summary={purchaseConfirmationSummary(settlement)} receipt={{ kind: 'purchases', id: settlement.id }} newLabel="Nueva compra" onNew={onNew} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.md, justifyContent: 'center', paddingBottom: spacing.md, paddingTop: spacing.sm },
});
