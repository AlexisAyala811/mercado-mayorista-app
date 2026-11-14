import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { BuyerStatementScreen } from '@/features/accounts/screens/buyer-statement-screen';
import { ApiError, ApiUnavailableError } from '@/services/api/api-client';
import { recordShareAttempt } from '@/services/api/messaging-api';
import { getBuyerStatement, statementErrorMessage, type BuyerStatement } from '@/services/api/statement-api';
import { downloadStatement, openStatementShare } from '@/services/receipts/statement-sharing';

const mockSession = { accessToken: 'test-token', user: { role: 'wholesaler' } };
jest.mock('@/features/auth/session/session-provider', () => ({ useSession: () => ({ session: mockSession }) }));
jest.mock('@/services/api/statement-api', () => ({ ...jest.requireActual('@/services/api/statement-api'), getBuyerStatement: jest.fn() }));
jest.mock('@/services/api/messaging-api', () => ({ recordShareAttempt: jest.fn() }));
jest.mock('@/services/receipts/statement-sharing', () => ({ downloadStatement: jest.fn(), openStatementShare: jest.fn(), releaseStatementUri: jest.fn() }));
jest.mock('@/domain/reception/reception', () => ({ ...jest.requireActual('@/domain/reception/reception'), createOperationId: () => 'share-operation' }));
jest.mock('@/ui/components', () => {
  const react = jest.requireActual('react'); const control = (props: object) => react.createElement('test-control', props);
  return { AppButton: control, AppCard: control, AppScreen: control, EmptyState: control, FeedbackState: control, LoadingState: control, MetricTile: control, ScreenHeader: control };
});

const statement: BuyerStatement = {
  statementNumber: 'EC-2026-000123', cutoffAt: '2026-11-06T15:00:00Z', cutoffDate: '2026-11-06', businessName: 'MAÑAY',
  buyer: { id: 'buyer-id', name: 'Mercado Central' },
  totals: { outstandingCents: '150000', overdueCents: '50000', nextDue: { dueOn: '2026-11-20', amountCents: '100000' } },
  sales: [{ saleId: 's1', saleCode: 'V-0042', saleDate: '2026-10-01', initialCents: '200000', paidCents: '50000', returnedCents: '0', outstandingCents: '150000', installments: [
    { dueOn: '2026-11-01', outstandingCents: '50000', overdue: true },
    { dueOn: '2026-11-20', outstandingCents: '100000', overdue: false },
  ] }],
  imageAvailable: true, imageLimit: 12,
};
const file = { filename: 'EC-2026-000123.pdf', mimeType: 'application/pdf', sizeBytes: 2048, uri: 'file:///cache/EC-2026-000123.pdf' };
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  jest.mocked(getBuyerStatement).mockResolvedValue(statement);
  jest.mocked(downloadStatement).mockResolvedValue(file);
  jest.mocked(openStatementShare).mockResolvedValue(undefined);
  jest.mocked(recordShareAttempt).mockImplementation(async (_token, body) => ({ ...body, id: 'attempt', recipientName: 'Mercado Central', createdAt: '', updatedAt: '' }));
});
const host = (root: ReactTestRenderer, test: (props: Record<string, unknown>) => boolean) => root.root.findAll((node) => typeof node.type === 'string' && test(node.props));
async function render() {
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<BuyerStatementScreen buyerId="buyer-id" />); });
  return root;
}

it('previews totals, sales and overdue installments from the server', async () => {
  const root = await render();
  expect(getBuyerStatement).toHaveBeenCalledWith('test-token', 'buyer-id');
  expect(host(root, (p) => p.label === 'Saldo pendiente')[0]!.props.value).toBe('S/ 1500.00');
  expect(host(root, (p) => p.label === 'Vencido')[0]!.props.value).toBe('S/ 500.00');
  expect(host(root, (p) => p.label === 'Próximo vencimiento')[0]!.props.value).toBe('2026-11-20 · S/ 1000.00');
  expect(host(root, (p) => p.title === 'Venta V-0042 · 2026-10-01')).toHaveLength(1);
  expect(host(root, (p) => p.accessibilityLabel === 'Cuota vencida')).toHaveLength(1);
  await act(async () => root.unmount());
});

it('sends the PDF through Mensajería: prepared, then sharing requested, with the buyer as recipient', async () => {
  const root = await render();
  await act(async () => { host(root, (p) => p.label === 'Correo')[0]!.props.onPress(); });
  await act(async () => { host(root, (p) => p.label === 'Enviar PDF')[0]!.props.onPress(); });
  expect(downloadStatement).toHaveBeenCalledWith('pdf', 'buyer-id', 'test-token', 'EC-2026-000123');
  expect(jest.mocked(recordShareAttempt).mock.calls.map((call) => call[1].state)).toEqual(['prepared', 'sharing_requested']);
  expect(jest.mocked(recordShareAttempt).mock.calls[0]![1]).toEqual({ clientOperationId: 'share-operation', recipientId: 'buyer-id', recipientKind: 'buyer', channel: 'email', filename: 'EC-2026-000123.pdf', mimeType: 'application/pdf', sizeBytes: 2048, state: 'prepared' });
  expect(openStatementShare).toHaveBeenCalledWith(file, 'Mercado Central');
  expect(host(root, (p) => p.title === 'Compartición solicitada')).toHaveLength(1);
  await act(async () => root.unmount());
});

it('records a failed attempt when the share sheet cannot open', async () => {
  jest.mocked(openStatementShare).mockRejectedValueOnce(new Error('La compartición de archivos no está disponible en este dispositivo.'));
  const root = await render();
  await act(async () => { host(root, (p) => p.label === 'Enviar PDF')[0]!.props.onPress(); });
  expect(jest.mocked(recordShareAttempt).mock.calls.map((call) => call[1].state)).toEqual(['prepared', 'failed']);
  expect(host(root, (p) => p.title === 'No se pudo enviar')[0]!.props.message).toBe('La compartición de archivos no está disponible en este dispositivo.');
  await act(async () => root.unmount());
});

it('disables the image with an explanation when it would not be readable', async () => {
  jest.mocked(getBuyerStatement).mockResolvedValueOnce({ ...statement, imageAvailable: false });
  const root = await render();
  expect(host(root, (p) => p.label === 'Enviar imagen')[0]!.props.disabled).toBe(true);
  expect(JSON.stringify(root.toJSON())).toContain('La imagen admite hasta 12 ventas');
  await act(async () => root.unmount());
});

it('shows the no-debt state without sales', async () => {
  jest.mocked(getBuyerStatement).mockResolvedValueOnce({ ...statement, sales: [], totals: { outstandingCents: '0', overdueCents: '0', nextDue: null } });
  const root = await render();
  expect(host(root, (p) => p.title === 'Sin deuda')).toHaveLength(1);
  expect(host(root, (p) => p.label === 'Próximo vencimiento')[0]!.props.value).toBe('Sin cuotas pendientes');
  await act(async () => root.unmount());
});

it.each([
  ['offline', new ApiUnavailableError(), 'Sin conexión'],
  ['inconsistent', new ApiError('x', 409, 'statement-inconsistent'), 'No se pudo preparar el estado de cuenta'],
])('keeps a retry when the statement is %s', async (_case, cause, title) => {
  jest.mocked(getBuyerStatement).mockRejectedValueOnce(cause);
  const root = await render();
  const feedback = host(root, (p) => p.title === title)[0]!;
  expect(feedback.props.actionLabel).toBe('Reintentar');
  await act(async () => { feedback.props.onAction(); });
  expect(getBuyerStatement).toHaveBeenCalledTimes(2);
  expect(host(root, (p) => p.label === 'Saldo pendiente')).toHaveLength(1);
  await act(async () => root.unmount());
});

it('explains each statement error the server returns', () => {
  expect(statementErrorMessage(new ApiError('x', 404))).toContain('ya no existe');
  expect(statementErrorMessage(new ApiError('x', 409, 'statement-inconsistent'))).toContain('no cuadran');
  expect(statementErrorMessage(new ApiError('x', 409))).toContain('cambiaron');
  expect(statementErrorMessage(new ApiError('x', 422, 'statement-image-too-long'))).toContain('Envía el PDF');
  expect(statementErrorMessage(new ApiError('x', 403))).toContain('Solo el Mayorista');
});
