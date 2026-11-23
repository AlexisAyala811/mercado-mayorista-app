import type { ShareState } from './share-attempt.entity.js';

const types: Record<string, string> = { pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', heic: 'image/heic', heif: 'image/heif' };
export function validAttachment(filename: string, mimeType: string, size: number): boolean {
  if (!filename.trim() || filename.length > 160 || filename.split('').some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127 || char === '/' || char === '\\')) return false;
  const extension = filename.split('.').at(-1)?.toLowerCase() ?? '';
  return Object.hasOwn(types, extension) && types[extension] === mimeType && Number.isSafeInteger(size) && size > 0 && size <= 20 * 1024 * 1024;
}
export function canTransition(current: ShareState, next: ShareState): boolean {
  return current === next || (current === 'prepared' && (next === 'sharing_requested' || next === 'failed'));
}
