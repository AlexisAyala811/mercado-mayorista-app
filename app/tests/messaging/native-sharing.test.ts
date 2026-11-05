import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import { releaseAttachment, requestAttachmentShare, type Attachment } from '@/services/messaging/attachment-sharing';
const mockDelete = jest.fn();
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
jest.mock('expo-file-system', () => ({ Paths:{cache:{uri:'file:///cache/'}}, File: class { exists = true; delete() { mockDelete(); } } }));
const attachment = (): Attachment => ({ uri: 'file:///cache/DocumentPicker/a.pdf', filename: 'a.pdf', sizeBytes: 100, mimeType: 'application/pdf' });
beforeEach(() => { jest.clearAllMocks(); Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' }); jest.mocked(Sharing.isAvailableAsync).mockResolvedValue(true); jest.mocked(Sharing.shareAsync).mockResolvedValue(undefined); });
it('does not open another app after authorization context closes while availability is pending', async () => {
  let resolve!: (value: boolean) => void; let active = true;
  jest.mocked(Sharing.isAvailableAsync).mockReturnValueOnce(new Promise(done => { resolve = done; }));
  const promise = requestAttachmentShare(attachment(), 'Cliente', () => active);
  active = false; resolve(true);
  await expect(promise).resolves.toBe('cancelled'); expect(Sharing.shareAsync).not.toHaveBeenCalled();
});
it('does not remove an attachment already granted to an external selector when the screen closes', async () => {
  let resolve!: () => void; jest.mocked(Sharing.shareAsync).mockReturnValueOnce(new Promise(done => { resolve = done; }));
  const file = attachment(); const promise = requestAttachmentShare(file, 'Proveedor');
  await Promise.resolve(); await Promise.resolve();
  expect(file.handedOff).toBe(true); releaseAttachment(file); expect(mockDelete).not.toHaveBeenCalled();
  resolve(); await expect(promise).resolves.toBe('sharing_requested');
});
it('cleans unshared local copies and reports unsupported selectors honestly', async () => {
  releaseAttachment(attachment()); expect(mockDelete).toHaveBeenCalledTimes(1);
  jest.mocked(Sharing.isAvailableAsync).mockResolvedValue(false);
  await expect(requestAttachmentShare(attachment(), 'Cliente')).rejects.toThrow('compatibles');
  expect(Sharing.shareAsync).not.toHaveBeenCalled();
});
it.each(['file:///documents/a.pdf','content://provider/a.pdf','file:///cache/a.pdf','file:///cache/DocumentPicker/../receipts/a.pdf','file:///cache/DocumentPicker/%2e%2e/receipts/a.pdf','file:///cache/DocumentPicker/%2f..%2fa.pdf','file:///cache/DocumentPicker/subfolder/a.pdf','file:///cache/DocumentPicker/','file://remote/cache/DocumentPicker/a.pdf'])('never deletes a source outside the individual picker-cache file: %s',uri=>{
  releaseAttachment({uri}); expect(mockDelete).not.toHaveBeenCalled();
});
