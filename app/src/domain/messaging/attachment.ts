export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
export const ATTACHMENT_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/*'];
const mimeByExtension: Record<string, string> = { pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', heic: 'image/heic', heif: 'image/heif' };
export type AttachmentMetadata = { filename: string; mimeType: string; sizeBytes: number };
export function attachmentMetadata(name: string, reportedMime: string | undefined, size: number | undefined): AttachmentMetadata {
  if (!name.trim() || name.length > 160 || /[\\/\u0000-\u001f\u007f]/.test(name)) throw new Error('El nombre del archivo no es válido.');
  const extension = name.split('.').at(-1)?.toLowerCase() ?? '';
  const mimeType = mimeByExtension[extension];
  if (!Object.hasOwn(mimeByExtension, extension) || !mimeType || (reportedMime && reportedMime !== 'application/octet-stream' && reportedMime !== mimeType)) throw new Error('Selecciona un PDF, DOC/DOCX, JPEG, PNG, WEBP, GIF o HEIC/HEIF compatible.');
  if (!Number.isSafeInteger(size) || !size || size < 1) throw new Error('No se pudo verificar el tamaño del archivo. Selecciona otro archivo.');
  if (size > MAX_ATTACHMENT_BYTES) throw new Error('El archivo supera el límite de 20 MiB.');
  return { filename: name, mimeType, sizeBytes: size };
}
