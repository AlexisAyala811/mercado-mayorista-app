import { attachmentMetadata, MAX_ATTACHMENT_BYTES } from '@/domain/messaging/attachment';
import { canAccessModule } from '@/features/auth/authorization/permissions';
it('retains allowed attachment metadata while rejecting disguised, empty and oversized files', () => {
  expect(attachmentMetadata('venta.PDF', 'application/octet-stream', 400)).toEqual({ filename: 'venta.PDF', mimeType: 'application/pdf', sizeBytes: 400 });
  expect(attachmentMetadata('foto.jpg', 'image/jpeg', MAX_ATTACHMENT_BYTES).sizeBytes).toBe(MAX_ATTACHMENT_BYTES);
  expect(() => attachmentMetadata('factura.exe', 'application/pdf', 100)).toThrow();
  expect(() => attachmentMetadata('nota.pdf', 'image/png', 100)).toThrow();
  expect(() => attachmentMetadata('doc.docx', undefined, MAX_ATTACHMENT_BYTES + 1)).toThrow('20 MiB');
  expect(() => attachmentMetadata('doc.pdf', undefined, undefined)).toThrow('tamaño');
  expect(() => attachmentMetadata('doc.pdf', undefined, 0)).toThrow();
});
it('keeps the messaging module exclusive to Mayorista', () => {
  expect(canAccessModule('wholesaler', 'messaging')).toBe(true);
  expect(canAccessModule('assistant', 'messaging')).toBe(false);
});
