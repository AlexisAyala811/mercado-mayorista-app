import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { prepareReport, shareReport, type PreparedReport, type ReportKind, type ReportSelection } from '@/services/reports/report-sharing';
import { ReceiptPreview } from '@/features/receipts/components/receipt-preview';
import { ApiError } from '@/services/api/api-client';
import { ReportRowsDialog } from './report-rows-dialog';
import { AppButton, FeedbackState } from '@/ui/components';
import { ReportAsset } from '@/ui/components/report-asset';
import { useReportFonts } from '@/ui/report-fonts';
import { reportVisual } from '@/ui/report-tokens';

export function ReportDownloads({ selection, token, counts, onSessionExpired }: { selection: ReportSelection; token: string; counts?: { operationCount: string; counterpartyCount?: string; varietyCount?: string }; onSessionExpired?: () => void | Promise<void> }) {
  const fontsLoaded = useReportFonts();
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 1000 || fontScale > 1.3;
  const regularFont = fontsLoaded && { fontFamily: 'ReportInterRegular' };
  const semiBoldFont = fontsLoaded && { fontFamily: 'ReportInterSemiBold' };
  const operationLabel = selection.operation === 'purchase' ? 'compras' : 'ventas';
  const recordCount = (value: string | undefined, singular: string, plural: string) =>
    value === undefined ? undefined : `${value} ${value === '1' ? singular : plural}`;
  const active = useRef(true);
  const inFlight = useRef(false);
  const previewFile = useRef<PreparedReport | null>(null);
  const [preview, setPreview] = useState<{ uri: string; title: string; filename: string } | null>(null);
  const [tableReport, setTableReport] = useState<'detail' | 'variety' | null>(null);
  const [busy, setBusy] = useState<ReportKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  useEffect(() => { active.current = true; return () => { active.current = false; previewFile.current?.release(); previewFile.current = null; }; }, []);
  const items: { kind: ReportKind; label: string; title: string; description: string; records?: string; format: string }[] = [
    { kind: 'summary', label: 'Resumen del período', title: `Resumen de ${operationLabel}`, description: 'Importes y saldos del período', records: recordCount(counts?.operationCount, selection.operation === 'purchase' ? 'compra' : 'venta', operationLabel), format: 'PDF' },
    { kind: 'detail', label: 'Detalle de operaciones', title: `Detalle de ${operationLabel}`, description: 'Registro completo de cada operación', records: recordCount(counts?.operationCount, selection.operation === 'purchase' ? 'compra' : 'venta', operationLabel), format: 'Excel' },
    { kind: 'counterparty', label: selection.operation === 'purchase' ? 'Por proveedor' : 'Por comprador', title: `${selection.operation === 'purchase' ? 'Compras por proveedor' : 'Ventas por comprador'}`, description: 'Totales agrupados por contraparte', records: recordCount(counts?.counterpartyCount, selection.operation === 'purchase' ? 'proveedor' : 'comprador', selection.operation === 'purchase' ? 'proveedores' : 'compradores'), format: 'PDF' },
    { kind: 'variety', label: 'Por variedad', title: `${selection.operation === 'purchase' ? 'Compras' : 'Ventas'} por variedad`, description: 'Cantidades y subtotales asignados', records: recordCount(counts?.varietyCount, 'variedad', 'variedades'), format: 'Excel' },
  ];
  function closePreview() { previewFile.current?.release(); previewFile.current = null; setPreview(null); }
  async function download(kind: ReportKind, mode: 'share' | 'preview' = 'share') {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(kind); setError(null); setCompleted(false);
    try {
      if (mode === 'preview') {
        const file = await prepareReport(selection, kind, token, () => active.current);
        if (!file) return;
        if (!active.current) { file.release(); return; }
        previewFile.current?.release(); previewFile.current = file;
        setPreview({ uri: file.uri, filename: file.filename, title: `${items.find(item => item.kind === kind)?.label} de ${selection.operation === 'purchase' ? 'compras' : 'ventas'}` });
      } else {
        const shared = await shareReport(selection, kind, token, () => active.current);
        if (active.current) setCompleted(shared);
      }
    } catch (reason) {
      if (active.current) {
        if (reason instanceof ApiError && reason.status === 401) {
          setError('La sesión venció. Inicia sesión nuevamente.');
          void onSessionExpired?.();
        } else setError(reason instanceof Error ? reason.message : 'No se pudo abrir el reporte.');
      }
    } finally { inFlight.current = false; if (active.current) setBusy(null); }
  }
  return <View style={styles.section}>
    <View style={styles.heading}>
      <View style={styles.headingCopy}><Text accessibilityRole="header" style={[styles.headingTitle, fontsLoaded && { fontFamily: 'ReportRalewayBold' }]}>Reportes disponibles</Text><Text style={[styles.help, regularFont]}>4 reportes</Text></View>
      <Text style={[styles.help, regularFont]}>Todos usan el período consultado</Text>
    </View>
    <View style={styles.table}>
      {!compact ? <View style={styles.columns}>
        <Text style={[styles.columnLabel, styles.info, semiBoldFont]}>Reporte</Text>
        <Text style={[styles.columnLabel, styles.records, semiBoldFont]}>Registros</Text>
        <Text style={[styles.columnLabel, styles.formatColumn, semiBoldFont]}>Formato</Text>
        <Text style={[styles.columnLabel, styles.actionsColumn, styles.alignEnd, semiBoldFont]}>Acciones</Text>
      </View> : null}
      {items.map((item, index) => <View key={item.kind} style={[styles.row, compact && styles.compactRow, index === items.length - 1 && styles.lastRow]}>
        <View style={[!compact && styles.info, styles.description]}>
          <View style={styles.document}><ReportAsset kind="document" /></View>
          <View style={styles.copy}><Text style={[styles.rowTitle, semiBoldFont]}>{item.title}</Text><Text style={[styles.help, regularFont]}>{item.description}</Text></View>
        </View>
        <Text style={[styles.recordText, !compact && styles.records, regularFont]}>{item.records ?? 'Registros no disponibles'}</Text>
        <View style={!compact && styles.formatColumn}><View style={styles.badge}><Text style={[styles.badgeText, semiBoldFont]}>{item.format}</Text></View></View>
        <View style={[styles.actions, !compact && styles.actionsColumn]}>
          <AppButton label={`Consultar ${item.label}`} displayLabel="Consultar" leadingVisual={<ReportAsset kind="consult" />} appearance="report" reportFontsLoaded={fontsLoaded}
            disabled={busy !== null} tone="secondary" onPress={() => {
              if (item.kind === 'detail' || item.kind === 'variety') setTableReport(item.kind);
              else void download(item.kind, 'preview');
            }} />
          <AppButton label={busy === item.kind ? 'Preparando…' : `Descargar ${item.label} (${item.format})`} displayLabel={busy === item.kind ? 'Preparando…' : 'Descargar'}
            leadingVisual={<ReportAsset kind="download" />} appearance="report" reportFontsLoaded={fontsLoaded} disabled={busy !== null} tone="secondary" onPress={() => void download(item.kind)} />
        </View>
      </View>)}
    </View>
    <Text style={[styles.help, regularFont]}>Se generan con datos actuales del período consultado. Los filtros de precios no modifican estas descargas.</Text>
    {error ? <FeedbackState title="Reporte no disponible" message={error} tone="error" /> : null}
    {completed ? <FeedbackState title="Archivo preparado" message="Se solicitó la descarga o se abrió el menú para compartir. Comprueba el destino elegido." tone="success" /> : null}
    {preview ? <ReceiptPreview onClose={closePreview} title={preview.title} uri={preview.uri} filename={preview.filename} documentKind="reporte" /> : null}
    {tableReport ? <ReportRowsDialog key={tableReport} token={token} selection={selection} report={tableReport} onClose={() => setTableReport(null)} onSessionExpired={onSessionExpired} /> : null}
  </View>;
}

const styles = StyleSheet.create({
  section: { gap: 14 }, heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  headingCopy: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  headingTitle: { color: reportVisual.title, fontSize: 18, lineHeight: 26, fontWeight: '700' },
  help: { color: reportVisual.secondary, fontSize: 12, lineHeight: 18 },
  table: { borderWidth: 1, borderColor: reportVisual.border, borderRadius: 20, backgroundColor: reportVisual.surface },
  columns: { minHeight: 42, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, gap: 20, backgroundColor: reportVisual.control, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  columnLabel: { fontSize: 12, lineHeight: 18, fontWeight: '600', color: reportVisual.title },
  info: { flex: 1, minWidth: 0 }, records: { width: 156 }, formatColumn: { width: 85 }, actionsColumn: { width: 252 },
  alignEnd: { textAlign: 'right' }, row: { minHeight: 70, paddingHorizontal: 22, paddingVertical: 12, gap: 20, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: reportVisual.separator },
  lastRow: { borderBottomWidth: 0 }, compactRow: { flexDirection: 'column', alignItems: 'stretch', gap: 12, padding: 16 },
  description: { flexDirection: 'row', alignItems: 'center', gap: 14, minWidth: 0 },
  document: { width: 40, height: 40, borderRadius: 10, backgroundColor: reportVisual.control, justifyContent: 'center', alignItems: 'center' },
  copy: { flex: 1, minWidth: 0, gap: 5 }, rowTitle: { color: reportVisual.value, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  recordText: { color: reportVisual.secondary, fontSize: 13, lineHeight: 19 },
  badge: { alignSelf: 'flex-start', backgroundColor: reportVisual.control, borderRadius: 6, paddingHorizontal: 9, paddingVertical: 5 },
  badgeText: { color: reportVisual.title, fontSize: 11, lineHeight: 16, fontWeight: '600' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 },
});
