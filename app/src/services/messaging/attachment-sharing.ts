import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { File as LocalFile, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import { ATTACHMENT_TYPES, attachmentMetadata, type AttachmentMetadata } from '@/domain/messaging/attachment';

export type Attachment = AttachmentMetadata & { uri: string; webFile?: File; handedOff?: boolean };
export async function pickAttachment(): Promise<Attachment | null> {
  const picked = await DocumentPicker.getDocumentAsync({ type: ATTACHMENT_TYPES, multiple: false, copyToCacheDirectory: true, base64: false });
  if (picked.canceled) return null;
  const asset = picked.assets[0];
  try {
    const size = asset.size ?? (Platform.OS === 'web' ? asset.file?.size : new LocalFile(asset.uri).size);
    return { ...attachmentMetadata(asset.name, asset.mimeType, size), uri: asset.uri, webFile: asset.file };
  } catch (error) { releaseAttachment({ uri: asset.uri }); throw error; }
}
export function releaseAttachment(attachment: { uri: string; handedOff?: boolean }) {
  if (attachment.handedOff) return; // Another app may still be reading the granted file.
  if (Platform.OS === 'web') { if (attachment.uri.startsWith('blob:')) URL.revokeObjectURL(attachment.uri); }
  else {
    try {
      const base = Paths.cache.uri.replace(/\/?$/, '/');
      const root = new URL('DocumentPicker/', base);
      const candidate = new URL(attachment.uri);
      const relative = candidate.pathname.slice(root.pathname.length);
      if (candidate.protocol !== 'file:' || candidate.host !== root.host || !candidate.pathname.startsWith(root.pathname) || !relative || relative.includes('/') || /%(?:2f|5c|2e)/i.test(relative) || candidate.search || candidate.hash) return;
      const file = new LocalFile(candidate.href);
      if (file.exists) file.delete();
    } catch { /* Cache cleanup must not replace the commercial result. */ }
  }
}
export function downloadAttachmentCopy(attachment: Attachment) {
  if (Platform.OS !== 'web' || !attachment.webFile) throw new Error('El navegador no conservó el archivo seleccionado. Vuelve a seleccionarlo.');
  const url = URL.createObjectURL(attachment.webFile);
  try {
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = attachment.filename; anchor.click();
  } finally { setTimeout(() => URL.revokeObjectURL(url), 30_000); }
}
export async function requestAttachmentShare(attachment: Attachment, recipientName: string, canContinue: () => boolean = () => true): Promise<'sharing_requested' | 'downloaded' | 'cancelled'> {
  if (!canContinue()) return 'cancelled';
  if (Platform.OS === 'web') {
    if (!attachment.webFile) throw new Error('El navegador no conservó el archivo seleccionado. Vuelve a seleccionarlo.');
    const data = { files: [attachment.webFile], title: `Documento para ${recipientName}` };
    if (navigator.canShare?.(data)) {
      try { await navigator.share(data); return 'sharing_requested'; }
      catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return 'cancelled';
        throw new Error('Este navegador no permitió abrir el selector para compartir. Usa «Descargar copia» y adjunta el archivo manualmente en WhatsApp o correo.');
      }
    }
    downloadAttachmentCopy(attachment);
    return 'downloaded';
  }
  if (!(await Sharing.isAvailableAsync())) throw new Error('No hay aplicaciones compatibles disponibles para compartir este archivo.');
  if (!canContinue()) return 'cancelled';
  // The picker can outlive this screen. Do not remove a file already granted to another app.
  attachment.handedOff = true;
  await Sharing.shareAsync(attachment.uri, { mimeType: attachment.mimeType, dialogTitle: `Elige WhatsApp o correo para ${recipientName}` });
  return 'sharing_requested';
}
