import { fetch } from 'expo/fetch';
import { File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { prepareReport, shareReport } from '@/services/reports/report-sharing';
jest.mock('expo/fetch', () => ({ fetch: jest.fn() }));
jest.mock('expo-file-system', () => ({ Paths: { cache: 'cache' }, File: jest.fn().mockImplementation(() => ({ uri: 'file://report.xlsx', exists: true, create: jest.fn(), write: jest.fn(), delete: jest.fn() })) }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
jest.mock('@/services/api/api-client', () => ({ getApiBaseUrl: () => 'http://test/api', ApiError: class extends Error {}, ApiUnavailableError: class extends Error {} }));
const selection = { operation: 'sale' as const, from: '2026-10-01', to: '2026-10-19' };
const mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
type FetchResult = Awaited<ReturnType<typeof fetch>>;
const response = { ok: true, headers: { get: () => mime }, bytes: async () => new Uint8Array([80, 75]) } as unknown as FetchResult;
beforeEach(() => { jest.clearAllMocks(); jest.mocked(fetch).mockResolvedValue(response); jest.mocked(Sharing.isAvailableAsync).mockResolvedValue(true); });
it('prepares a preview without opening sharing and leaves cleanup to its owner', async () => {
  const file = await prepareReport(selection, 'detail', 'token', () => true);
  expect(file?.uri).toBe('file://report.xlsx');
  expect(Sharing.isAvailableAsync).not.toHaveBeenCalled();
  expect(Sharing.shareAsync).not.toHaveBeenCalled();
  expect(jest.mocked(File).mock.results[0].value.delete).not.toHaveBeenCalled();
  file?.release();
  expect(jest.mocked(File).mock.results[0].value.delete).toHaveBeenCalledTimes(1);
});
it('requests the selected report with authentication and shares the actual Excel format', async () => {
  expect(await shareReport(selection, 'detail', 'token', () => true)).toBe(true);
  expect(fetch).toHaveBeenCalledWith('http://test/api/reports/export?operation=sale&from=2026-10-01&to=2026-10-19&report=detail', { headers: { Accept: mime, Authorization: 'Bearer token' } });
  expect(Sharing.shareAsync).toHaveBeenCalledWith('file://report.xlsx', expect.objectContaining({ mimeType: mime }));
  const file = jest.mocked(File).mock.results[0].value;
  expect(file.delete).toHaveBeenCalledTimes(1);
});
it('discards a completed response after the period or session changes', async () => {
  expect(await shareReport(selection, 'detail', 'token', () => false)).toBe(false);
  expect(File).not.toHaveBeenCalled(); expect(Sharing.shareAsync).not.toHaveBeenCalled();
});
it('does not share a mismatched format', async () => {
  await expect(shareReport(selection, 'summary', 'token', () => true)).rejects.toThrow('formato');
  expect(File).not.toHaveBeenCalled();
});
it('cleans the temporary file even when sharing fails', async () => {
  jest.mocked(Sharing.shareAsync).mockRejectedValueOnce(new Error('share failed'));
  await expect(shareReport(selection, 'detail', 'token', () => true)).rejects.toThrow('share failed');
  expect(jest.mocked(File).mock.results[0].value.delete).toHaveBeenCalledTimes(1);
});
