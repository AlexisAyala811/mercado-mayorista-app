import { fetch } from 'expo/fetch';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { ApiError, ApiUnavailableError, getApiBaseUrl } from '@/services/api/api-client';

export type ReportKind = 'summary' | 'detail' | 'counterparty' | 'variety';
export type ReportSelection = { operation: 'purchase' | 'sale'; from: string; to: string };

export type PreparedReport = { filename: string; uri: string; mimeType: string; release: () => void };

export async function prepareReport(selection: ReportSelection, report: ReportKind, token: string, canContinue: () => boolean): Promise<PreparedReport | null> {
  const excel = report === 'detail' || report === 'variety';
  const mimeType = excel ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf';
  const query = new URLSearchParams({ ...selection, report });
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}/reports/export?${query}`, { headers: { Accept: mimeType, Authorization: `Bearer ${token}` } });
  } catch { throw new ApiUnavailableError(); }
  if (!response.ok) throw new ApiError('No se pudo generar el reporte. Vuelve a intentarlo.', response.status);
  if (!canContinue()) return null;
  if (!(response.headers.get('content-type') ?? '').startsWith(mimeType)) throw new Error('El servidor no devolvió el formato de reporte solicitado.');
  const filename = `reporte-${selection.operation}-${report}-${selection.from}-${selection.to}.${excel ? 'xlsx' : 'pdf'}`;
  if (Platform.OS === 'web') {
    const blob = await response.blob();
    if (!canContinue()) return null;
    const uri = URL.createObjectURL(blob);
    return { filename, uri, mimeType, release: () => URL.revokeObjectURL(uri) };
  }
  const bytes = await response.bytes();
  if (!canContinue()) return null;
  const file = new File(Paths.cache, `${Date.now()}-${filename}`);
  try {
    file.create({ overwrite: false }); file.write(bytes);
    return { filename, uri: file.uri, mimeType, release: () => { if (file.exists) file.delete(); } };
  } catch (error) { if (file.exists) file.delete(); throw error; }
}

export async function shareReport(selection: ReportSelection, report: ReportKind, token: string, canContinue: () => boolean) {
  const file = await prepareReport(selection, report, token, canContinue);
  if (!file) return false;
  if (!canContinue()) { file.release(); return false; }
  if (Platform.OS === 'web') {
    const link = document.createElement('a');
    link.href = file.uri; link.download = file.filename;
    document.body.appendChild(link);
    try { link.click(); } finally { link.remove(); setTimeout(file.release, 60000); }
    return true;
  }
  try {
    if (!(await Sharing.isAvailableAsync())) throw new Error('La compartición no está disponible en este dispositivo.');
    if (!canContinue()) return false;
    await Sharing.shareAsync(file.uri, { dialogTitle: 'Compartir reporte', mimeType: file.mimeType,
      UTI: file.mimeType === 'application/pdf' ? 'com.adobe.pdf' : 'org.openxmlformats.spreadsheetml.sheet' });
    return true;
  } finally { file.release(); }
}
