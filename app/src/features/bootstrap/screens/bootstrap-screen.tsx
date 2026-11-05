import { StyleSheet, Text } from 'react-native';

import { AppCard, AppScreen, ScreenHeader } from '@/ui/components';
import { color, spacing, typography } from '@/ui/tokens';

export function BootstrapScreen() {
  return (
    <AppScreen contentContainerStyle={styles.screen}>
      <ScreenHeader
        description="La aplicación se construirá por cortes especificados y validados para la gestión comercial de papa."
        eyebrow="MERCADO"
        title="Base técnica preparada"
      />
      <AppCard style={styles.notice} title="Implementación controlada por especificaciones">
        <Text style={styles.noticeText}>
          Las funciones de acceso, pesaje, compras, ventas y cuentas se habilitarán cuando sus reglas de negocio estén aprobadas.
        </Text>
      </AppCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl, justifyContent: 'center' },
  notice: { backgroundColor: color.brandMuted, borderColor: color.brandMuted, maxWidth: 720 },
  noticeText: { color: color.textPrimary, ...typography.bodySmall },
});
