import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { ReportRowsDialog } from '@/features/reports/screens/report-rows-dialog';
import { listReportRows, type ReportRowsPage } from '@/services/api/report-rows-api';
import { ApiError } from '@/services/api/api-client';
// These unit tests exercise requests and page lifecycle; native presentation is
// covered by device/UI QA. Avoid loading the native Modal implementation here.
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  const descriptors = Object.getOwnPropertyDescriptors(actual);
  delete descriptors.Modal;
  return Object.defineProperties({ Modal: (props: object) => jest.requireActual('react').createElement('test-modal', props) }, descriptors);
});
jest.mock('@/services/api/report-rows-api', () => ({ listReportRows: jest.fn() }));
jest.mock('@/ui/components', () => {
  const control = (props: object) => jest.requireActual('react').createElement('test-control', props);
  return { AppButton: control, EmptyState: control, FeedbackState: control, LoadingState: control };
});
const selection = { operation: 'sale' as const, from: '2026-10-01', to: '2026-10-19' };
const page: ReportRowsPage = { ...selection, period: { from: selection.from, to: selection.to }, generatedAt: '2026-10-19T23:00:00Z', total: '21', limit: 20, offset: 0, report: 'variety',
  items: Array.from({ length: 20 }, (_, index) => ({ id: String(index), name: `Variedad ${index}`, operations: '2', sacks: '4', weight: '20.125', subtotal: '9007199254740993' })) };
const control = (root: ReactTestRenderer, label: string) => root.root.findAll(node => node.type === 'test-control' as never && node.props.label === label)[0];
beforeEach(() => {
  jest.resetAllMocks();
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});
it('loads the following page without retaining previous rows and disables next at the end', async () => {
  jest.mocked(listReportRows).mockResolvedValueOnce(page);
  let finish!: (value: ReportRowsPage) => void;
  jest.mocked(listReportRows).mockImplementationOnce(() => new Promise(done => { finish = done; }));
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<ReportRowsDialog token="session" selection={selection} report="variety" onClose={jest.fn()} />); });
  try {
    expect(control(root, 'Página anterior').props.disabled).toBe(true);
    expect(JSON.stringify(root.toJSON())).toContain('Variedad 0');
    await act(async () => control(root, 'Página siguiente').props.onPress());
    expect(listReportRows).toHaveBeenLastCalledWith('session', selection, 'variety', 20);
    expect(JSON.stringify(root.toJSON())).not.toContain('Variedad 0');
    expect(control(root, 'Consultando reporte')).toBeDefined();
    await act(async () => finish({ ...page, offset: 20, items: [{ ...page.items[0], id: 'last', name: 'Última variedad', subtotal: null }] }));
    expect(JSON.stringify(root.toJSON())).toContain('No distribuido');
    expect(control(root, 'Página siguiente').props.disabled).toBe(true);
    expect(control(root, 'Página anterior').props.disabled).toBe(false);
  } finally { await act(async () => root.unmount()); }
});
it('offers retry after failure and distinguishes an empty result', async () => {
  jest.mocked(listReportRows).mockRejectedValueOnce(new Error('Sin conexión')).mockResolvedValueOnce({ ...page, total: '0', items: [] });
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<ReportRowsDialog token="session" selection={selection} report="variety" onClose={jest.fn()} />); });
  try {
    const error = root.root.findAll(node => node.type === 'test-control' as never && node.props.actionLabel === 'Reintentar consulta')[0];
    expect(error.props.message).toBe('Sin conexión');
    await act(async () => error.props.onAction());
    expect(JSON.stringify(root.toJSON())).toContain('Sin registros en esta página');
    expect(control(root, 'Página siguiente').props.disabled).toBe(true);
  } finally { await act(async () => root.unmount()); }
});
it('does not invalidate a newer session for a late failure after closing', async () => {
  let fail!: (error: Error) => void;
  jest.mocked(listReportRows).mockReturnValueOnce(new Promise((_resolve, reject) => { fail = reject; }));
  const expired = jest.fn();
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<ReportRowsDialog token="old-session" selection={selection} report="variety" onClose={jest.fn()} onSessionExpired={expired} />); });
  await act(async () => root.unmount());
  await act(async () => fail(new ApiError('Unauthorized', 401)));
  expect(expired).not.toHaveBeenCalled();
});
