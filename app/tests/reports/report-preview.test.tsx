import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { ReportDownloads } from '@/features/reports/screens/report-downloads';
import { ApiError } from '@/services/api/api-client';
import { ReportAsset } from '@/ui/components/report-asset';
import { prepareReport, shareReport, type PreparedReport } from '@/services/reports/report-sharing';
jest.mock('@/services/reports/report-sharing', () => ({ prepareReport: jest.fn(), shareReport: jest.fn() }));
jest.mock('@/features/receipts/components/receipt-preview', () => ({ ReceiptPreview: (props: object) => jest.requireActual('react').createElement('pdf-preview', props) }));
jest.mock('@/ui/components', () => {
  const control = (props: object) => { const { leadingVisual, ...rest } = props as { leadingVisual?: unknown; children?: unknown }; return jest.requireActual('react').createElement('test-control', rest, leadingVisual, rest.children); };
  return { AppButton: control, AppCard: control, FeedbackState: control };
});
const selection = { operation: 'purchase' as const, from: '2026-10-01', to: '2026-10-19' };
const button = (root: ReactTestRenderer, label: string) => root.root.findAll(node => node.type === 'test-control' as never && node.props.label === label)[0];
const preview = (root: ReactTestRenderer) => root.root.findAll(node => node.type === 'pdf-preview' as never)[0];
beforeEach(() => {
  jest.clearAllMocks();
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});
it('opens the authenticated PDF in the existing viewer and releases it on close', async () => {
  const release = jest.fn();
  jest.mocked(prepareReport).mockResolvedValue({ uri: 'file://summary.pdf', filename: 'summary.pdf', mimeType: 'application/pdf', release });
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<ReportDownloads selection={selection} token="session" />); });
  try {
    await act(async () => button(root, 'Consultar Resumen del período').props.onPress());
    expect(prepareReport).toHaveBeenCalledWith(selection, 'summary', 'session', expect.any(Function));
    expect(preview(root).props.uri).toBe('file://summary.pdf');
    expect(shareReport).not.toHaveBeenCalled();
    await act(async () => preview(root).props.onClose());
    expect(release).toHaveBeenCalledTimes(1); expect(preview(root)).toBeUndefined();
  } finally { await act(async () => root.unmount()); }
  expect(release).toHaveBeenCalledTimes(1);
});
it('releases a late PDF without displaying it after a period or session unmount', async () => {
  let finish!: (file: PreparedReport) => void;
  const release = jest.fn();
  jest.mocked(prepareReport).mockReturnValue(new Promise(done => { finish = done; }));
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<ReportDownloads selection={selection} token="session" />); });
  await act(async () => button(root, 'Consultar Por proveedor').props.onPress());
  await act(async () => root.unmount());
  await act(async () => finish({ uri: 'file://late.pdf', filename: 'late.pdf', mimeType: 'application/pdf', release }));
  expect(release).toHaveBeenCalledTimes(1); expect(shareReport).not.toHaveBeenCalled();
});
it('invalidates an expired session instead of opening a preview', async () => {
  const expired = jest.fn();
  jest.mocked(prepareReport).mockRejectedValueOnce(new ApiError('Unauthorized', 401));
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<ReportDownloads selection={selection} token="expired" onSessionExpired={expired} />); });
  try {
    await act(async () => button(root, 'Consultar Resumen del período').props.onPress());
    expect(expired).toHaveBeenCalledTimes(1);
    expect(preview(root)).toBeUndefined();
  } finally { await act(async () => root.unmount()); }
});
it('shows real report counts and all twelve original icon slots with descriptive actions', async () => {
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<ReportDownloads selection={selection} token="session" counts={{ operationCount: '17', counterpartyCount: '3', varietyCount: '5' }} />); });
  try {
    const text = JSON.stringify(root.toJSON());
    for (const value of ['17 compras', '3 proveedores', '5 variedades', '4 reportes']) expect(text).toContain(value);
    for (const kind of ['document', 'consult', 'download']) {
      expect(root.root.findAllByType(ReportAsset).filter(node => node.props.kind === kind)).toHaveLength(4);
    }
    expect(button(root, 'Consultar Resumen del período').props.displayLabel).toBe('Consultar');
    expect(button(root, 'Descargar Por variedad (Excel)').props.displayLabel).toBe('Descargar');
  } finally { await act(async () => root.unmount()); }
});
