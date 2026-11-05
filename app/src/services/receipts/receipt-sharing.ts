import { fetch } from 'expo/fetch';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { ApiError, ApiUnavailableError, getApiBaseUrl } from '@/services/api/api-client';

export type ReceiptKind = 'purchases' | 'sale-returns' | 'sales';

export async function downloadReceipt(kind: ReceiptKind, id: string, token: string) {
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}/receipts/${kind}/${id}.pdf`, {
      headers: { Accept: 'application/pdf', Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new ApiUnavailableError();
  }
  if (!response.ok) throw new ApiError('No se pudo generar el comprobante.', response.status);
  const receiptLabels: Record<ReceiptKind, string> = {
    purchases: 'compra',
    'sale-returns': 'devolucion-venta',
    sales: 'venta',
  };
  const filename = `${receiptLabels[kind]}-${id}.pdf`;
  if (Platform.OS === 'web') {
    const blob = await response.blob();
    return { filename, uri: URL.createObjectURL(blob) };
  }
  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true });
  file.write(await response.bytes());
  return { filename, uri: file.uri };
}

export function releaseReceiptUri(uri:string){
  if(Platform.OS==='web'&&uri.startsWith('blob:'))URL.revokeObjectURL(uri);
}
export async function shareReceipt(kind: ReceiptKind, id: string, token: string,canContinue:()=>boolean=()=>true) {
  const file = await downloadReceipt(kind, id, token);
  if(!canContinue()){releaseReceiptUri(file.uri);return null;}
  if (Platform.OS === 'web') {
    window.open(file.uri, '_blank', 'noopener,noreferrer');
    return file.uri;
  }
  if (!(await Sharing.isAvailableAsync())) throw new Error('La compartición de archivos no está disponible en este dispositivo.');
  if(!canContinue())return null;
  await Sharing.shareAsync(file.uri, { dialogTitle: 'Compartir comprobante', mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  return file.uri;
}
