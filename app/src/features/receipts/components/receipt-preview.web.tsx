import {WebPdfDocument} from './web-pdf-document';
import { Modal, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/ui/components';
import { color, radius, spacing, typography } from '@/ui/tokens';

type Props = { onClose: () => void; title: string; uri: string | null; filename?: string; documentKind?: 'comprobante' | 'reporte' };

export function ReceiptPreview({ onClose, title, uri, filename = 'comprobante.pdf', documentKind = 'comprobante' }: Props) {
  return <Modal animationType="fade" onRequestClose={onClose} visible={Boolean(uri)}><View style={styles.screen}><View style={styles.header}><Text accessibilityRole="header" style={styles.title}>{title}</Text><AppButton label="Cerrar" onPress={onClose} tone="secondary" /></View>{uri ? <><a href={uri} download={filename} style={{color:color.textOnBrand,backgroundColor:color.brand,borderRadius:radius.md,padding:spacing.md,minHeight:52,boxSizing:'border-box',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'system-ui, sans-serif',textAlign:'center',fontSize:typography.bodySmall.fontSize,fontWeight:'700',textDecoration:'none'}}>Descargar PDF</a><WebPdfDocument key={uri} uri={uri} documentKind={documentKind}/></> : null}</View></Modal>;
}

const styles = StyleSheet.create({ screen: { backgroundColor: color.surface, flex: 1, gap: spacing.md, padding: spacing.md }, header: { alignItems: 'center', backgroundColor: color.surfaceRaised, borderRadius: radius.lg, flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between', padding: spacing.md }, title: { color: color.textPrimary, ...typography.body, fontWeight: '700',flex:1,minWidth:0 } });
