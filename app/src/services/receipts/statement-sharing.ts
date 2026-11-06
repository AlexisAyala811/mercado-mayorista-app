import { fetch } from 'expo/fetch';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { ApiError, ApiUnavailableError, getApiBaseUrl } from '@/services/api/api-client';

export type StatementFormat = 'pdf' | 'png';
export type StatementFile = { filename: string; mimeType: string; sizeBytes: number; uri: string };

const mime: Record<StatementFormat, string> = { pdf: 'application/pdf', png: 'image/png' };

// Same download-then-share flow as the receipts (spec 009, T943). The server
// names the file after the statement number; the tablet keeps it in cache.
export async function downloadStatement(format: StatementFormat, buyerId: string, token: string, statementNumber: string): Promise<StatementFile> {
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}/receipts/buyer-statements/${encodeURIComponent(buyerId)}.${format}`, {
      headers: { Accept: mime[format], Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new ApiUnavailableError();
  }
  if (!response.ok) {
    let code: string | undefined;
    try { code = ((await response.json()) as { code?: string }).code; } catch { code = undefined; }
    throw new ApiError('No se pudo generar el estado de cuenta.', response.status, code);
  }
  const filename = `${statementNumber.replace(/[^\w.-]/g, '-')}.${format}`;
  const bytes = await response.bytes();
  if (Platform.OS === 'web') return { filename, mimeType: mime[format], sizeBytes: bytes.byteLength, uri: URL.createObjectURL(new Blob([bytes], { type: mime[format] })) };
  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true });
  file.write(bytes);
  return { filename, mimeType: mime[format], sizeBytes: bytes.byteLength, uri: file.uri };
}

export function releaseStatementUri(uri: string) {
  if (Platform.OS === 'web' && uri.startsWith('blob:')) URL.revokeObjectURL(uri);
}

// Opens the system share sheet; WhatsApp or e-mail are chosen there.
export async function openStatementShare(file: StatementFile, buyerName: string) {
  if (Platform.OS === 'web') { window.open(file.uri, '_blank', 'noopener,noreferrer'); return; }
  if (!(await Sharing.isAvailableAsync())) throw new Error('La compartición de archivos no está disponible en este dispositivo.');
  await Sharing.shareAsync(file.uri, {
    dialogTitle: `Enviar estado de cuenta a ${buyerName}`,
    mimeType: file.mimeType,
    UTI: file.mimeType === 'application/pdf' ? 'com.adobe.pdf' : 'public.png',
  });
}
