import { useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import Pdf from 'react-native-pdf';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton, FeedbackState, LoadingState } from '@/ui/components';
import { color, radius, spacing, typography } from '@/ui/tokens';

type Props = { onClose: () => void; title: string; uri: string | null; filename?: string; documentKind?: 'comprobante' | 'reporte' };

export function ReceiptPreview({ onClose, title, uri, documentKind = 'comprobante' }: Props) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={Boolean(uri)}>
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}><View style={styles.copy}><Text accessibilityRole="header" style={styles.title}>{title}</Text><Text style={styles.help}>Pellizca para ampliar y desplázate por las páginas.</Text></View><AppButton label="Cerrar" onPress={onClose} tone="secondary" /></View>
        {uri ? <PdfDocument key={uri} uri={uri} documentKind={documentKind} /> : <FeedbackState title="Sin documento" message={`Selecciona un ${documentKind} para previsualizarlo.`} tone="neutral" />}
      </SafeAreaView>
    </Modal>
  );
}

function PdfDocument({ uri, documentKind }: { uri: string; documentKind: 'comprobante' | 'reporte' }) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  function retry() {
    setFailed(false);
    setAttempt((current) => current + 1);
  }

  if (failed) return <FeedbackState actionLabel="Reintentar" onAction={retry} title={`No se pudo leer el ${documentKind}`} message="Reintenta la lectura. Si el problema continúa, cierra el documento y vuelve a abrir su vista previa para descargarlo nuevamente." tone="error" />;
  return <Pdf key={attempt} enablePaging={false} onError={() => setFailed(true)} renderActivityIndicator={() => <LoadingState label={`Abriendo ${documentKind}`} />} source={{ uri }} style={styles.pdf} trustAllCerts={false} />;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: color.surface, flex: 1, gap: spacing.md, padding: spacing.md },
  header: { alignItems: 'center', backgroundColor: color.surfaceRaised, borderRadius: radius.lg, flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  copy: { flex: 1 }, title: { color: color.textPrimary, ...typography.body, fontWeight: '700' }, help: { color: color.textSecondary, ...typography.bodySmall }, pdf: { flex: 1, width: '100%' },
});
