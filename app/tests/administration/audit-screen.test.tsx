import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { AuditScreen } from '@/features/administration/screens/audit-screen';
import { listAuditEvents, type AuditEvent } from '@/services/api/administration-api';
import type { Page } from '@/domain/reception/reception';

let mockSession: { accessToken: string; user: { role: string } } | null;
jest.mock('@/features/auth/session/session-provider', () => ({ useSession: () => ({ session: mockSession }) }));
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock('@/services/api/administration-api', () => ({ listAuditEvents: jest.fn() }));
jest.mock('@/ui/components', () => {
  const control = (props: object) => jest.requireActual('react').createElement('test-control', props);
  return { AppButton: control, AppCard: control, AppScreen: control, EmptyState: control, FeedbackState: control, FormField: control, LoadingState: control, ScreenHeader: control };
});

function event(id: string): AuditEvent {
  return { id, action: 'sale.created', actorUserId: 'actor', resourceId: id, resourceType: 'sale', details: {}, occurredAt: '2026-10-27T03:00:00Z', retentionUntil: '2031-10-27T03:00:00Z' };
}
function page(id: string, offset = 0, total = 1): Page<AuditEvent> { return { items: [event(id)], offset, total, limit: 20 }; }
const control = (root: ReactTestRenderer, label: string) => root.root.findAll(node => node.props.label === label)[0]!;
const rendered = (root: ReactTestRenderer) => JSON.stringify(root.toJSON());
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  jest.resetAllMocks(); mockSession = { accessToken: 'session-a', user: { role: 'wholesaler' } };
  jest.mocked(listAuditEvents).mockResolvedValue(page('initial-event'));
});
async function open() { let root!: ReactTestRenderer; await act(async () => { root = create(<AuditScreen />); }); return root; }

it('pages through the applied filters and retries a failed page without showing old rows', async () => {
  jest.mocked(listAuditEvents).mockResolvedValueOnce({ ...page('first'), items: Array.from({ length: 20 }, (_, i) => event(`row-${i}`)), total: 21 });
  const root = await open();
  try {
    expect(control(root, 'Página anterior de auditoría').props.disabled).toBe(true);
    jest.mocked(listAuditEvents).mockRejectedValueOnce(new Error('Sin conexión')).mockResolvedValueOnce(page('last-event', 20, 21));
    await act(async () => control(root, 'Página siguiente de auditoría').props.onPress());
    expect(rendered(root)).not.toContain('row-0');
    const retry = root.root.findAll(node => node.props.actionLabel === 'Reintentar consulta')[0]!;
    expect(retry.props.message).toBe('Sin conexión');
    await act(async () => retry.props.onAction());
    expect(listAuditEvents).toHaveBeenLastCalledWith('session-a', expect.any(Object), 20);
    expect(rendered(root)).toContain('last-event');
    expect(control(root, 'Página siguiente de auditoría').props.disabled).toBe(true);
    expect(control(root, 'Página anterior de auditoría').props.disabled).toBe(false);
  } finally { await act(async () => root.unmount()); }
});

it('ignores an older response after edited filters have produced a newer result', async () => {
  let finish!: (value: Page<AuditEvent>) => void;
  jest.mocked(listAuditEvents).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValueOnce(page('newer-event'));
  const root = await open();
  try {
    await act(async () => control(root, 'Acción exacta').props.onChangeText('sale.created'));
    await act(async () => control(root, 'Consultar').props.onPress());
    await act(async () => finish(page('older-event')));
    expect(rendered(root)).toContain('newer-event'); expect(rendered(root)).not.toContain('older-event');
  } finally { await act(async () => root.unmount()); }
});

it('removes all old-session results and ignores its late failure', async () => {
  const root = await open();
  try {
    let fail!: (reason: Error) => void;
    jest.mocked(listAuditEvents).mockImplementationOnce(() => new Promise((_resolve, reject) => { fail = reject; })).mockResolvedValueOnce(page('business-b-event'));
    await act(async () => control(root, 'Consultar').props.onPress());
    mockSession = { accessToken: 'session-b', user: { role: 'wholesaler' } };
    await act(async () => root.update(<AuditScreen />));
    await act(async () => fail(new Error('Error de la sesión anterior')));
    expect(rendered(root)).toContain('business-b-event');
    expect(rendered(root)).not.toContain('initial-event'); expect(rendered(root)).not.toContain('Error de la sesión anterior');
  } finally { await act(async () => root.unmount()); }
});

it('validates civil dates before requesting and sends Lima day filters instead of UTC days', async () => {
  const root = await open();
  try {
    await act(async () => control(root, 'Desde (AAAA-MM-DD)').props.onChangeText('2026-02-30'));
    await act(async () => control(root, 'Consultar').props.onPress());
    expect(listAuditEvents).toHaveBeenCalledTimes(1); expect(rendered(root)).toContain('Ingresa fechas válidas');
    await act(async () => { control(root, 'Desde (AAAA-MM-DD)').props.onChangeText('2026-10-26'); control(root, 'Hasta (AAAA-MM-DD)').props.onChangeText('2026-10-26'); });
    await act(async () => control(root, 'Consultar').props.onPress());
    expect(listAuditEvents).toHaveBeenLastCalledWith('session-a', expect.objectContaining({ fromDay: '2026-10-26', toDay: '2026-10-26' }), 0);
    expect(rendered(root)).toContain('26/10/2026'); expect(rendered(root)).toContain('26/10/2031');
  } finally { await act(async () => root.unmount()); }
});

it('does not restore results when a request finishes after the filters were edited', async () => {
  let finish!: (value: Page<AuditEvent>) => void;
  jest.mocked(listAuditEvents).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const root = await open();
  try {
    await act(async () => control(root, 'Tipo de recurso').props.onChangeText('sale'));
    await act(async () => finish(page('obsolete-event')));
    expect(rendered(root)).not.toContain('obsolete-event'); expect(rendered(root)).toContain('Consulta los filtros');
  } finally { await act(async () => root.unmount()); }
});

it.each([null, { accessToken: 'assistant', user: { role: 'assistant' } }])('does not request events without an authorized Mayorista', async session => {
  mockSession = session;
  const root = await open();
  expect(listAuditEvents).not.toHaveBeenCalled(); expect(root.toJSON()).toBeNull();
  await act(async () => root.unmount());
});
