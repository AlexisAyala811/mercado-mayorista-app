import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { parseStoredSession } from '@/domain/auth/session';
import { validateNewPassword } from '@/features/auth/screens/change-password-screen';
import { MerchantsScreen } from '@/features/merchants/screens/merchants-screen';
import { generateTemporaryPassword, groupForReading } from '@/features/merchants/temporary-password';
import { ApiUnavailableError } from '@/services/api/api-client';
import { createMerchant, getMerchantStatus, listMerchants, suspendMerchant } from '@/services/api/merchants-api';

// Spec 023: the Administrator of merchants in the app.
let mockRole = 'admin';
jest.mock('@/features/auth/session/session-provider', () => ({ useSession: () => ({ logout: jest.fn(), session: { accessToken: 'admin-token', user: { role: mockRole } } }) }));
jest.mock('expo-crypto', () => ({
  getRandomValues: (array: Uint8Array) => {
    array.forEach((_, index) => { array[index] = (index * 37 + 11) % 256; });
    return array;
  },
}));
jest.mock('@/services/api/merchants-api', () => ({
  createMerchant: jest.fn(), getMerchantStatus: jest.fn(), listMerchants: jest.fn(), reactivateMerchant: jest.fn(),
  resetMerchantPassword: jest.fn(), revokeMerchantSessions: jest.fn(), suspendMerchant: jest.fn(),
}));
jest.mock('@/ui/components', () => {
  const react = jest.requireActual('react'); const control = (props: object) => react.createElement('test-control', props);
  return { AppButton: control, AppCard: control, AppScreen: control, ConfirmationDialog: control, EmptyState: control, FeedbackState: control, FormField: control, LoadingState: control, ScreenHeader: control };
});

const merchant = { createdAt: '2026-11-26T15:00:00.000Z', displayName: 'Comercial Huanta', id: 'merchant-1', isActive: true, wholesaler: { id: 'w-1', isActive: true, lastLoginAt: null, mustChangePassword: true, username: 'huanta' } };
const host = (root: ReactTestRenderer, test: (props: Record<string, unknown>) => boolean) => root.root.findAll((node) => typeof node.type === 'string' && test(node.props));
const field = (root: ReactTestRenderer, label: string) => host(root, (props) => props.label === label && typeof props.onChangeText === 'function')[0]!;
const button = (root: ReactTestRenderer, label: string) => host(root, (props) => props.label === label && typeof props.onPress === 'function')[0]!;

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  mockRole = 'admin';
  jest.mocked(listMerchants).mockResolvedValue({ items: [merchant], limit: 50, offset: 0, total: 1 } as never);
  jest.mocked(getMerchantStatus).mockResolvedValue({ activeAssistants: 2, failedLoginAttempts: 3, lastFailedLoginAt: null, merchant, openSessions: 1 });
});

describe('session and passwords', () => {
  it('keeps an Administrator session and the forced password change', () => {
    const stored = { accessToken: 't', expiresAt: '2030-01-01T00:00:00.000Z', user: { businessId: 'p', businessName: 'Soporte', expiresAt: '2030-01-01T00:00:00.000Z', mustChangePassword: true, role: 'admin', sessionId: 's', userId: 'u', username: 'soporte' } };
    expect(parseStoredSession(JSON.stringify(stored))?.user).toMatchObject({ mustChangePassword: true, role: 'admin' });
    expect(parseStoredSession(JSON.stringify({ ...stored, user: { ...stored.user, mustChangePassword: 'yes' } }))).toBeNull();
  });

  it('validates the new password against the temporary one', () => {
    expect(validateNewPassword('', 'x'.repeat(12), 'x'.repeat(12))).toMatch('temporal');
    expect(validateNewPassword('Temporal-123', 'corta', 'corta')).toMatch('12 caracteres');
    expect(validateNewPassword('Temporal-1234', 'Temporal-1234', 'Temporal-1234')).toMatch('distinta');
    expect(validateNewPassword('Temporal-1234', 'Nueva-clave-99', 'Nueva-clave-98')).toMatch('no coinciden');
    expect(validateNewPassword('Temporal-1234', 'Nueva-clave-99', 'Nueva-clave-99')).toBeNull();
  });

  it('generates readable temporary passwords without look-alike characters', () => {
    const password = generateTemporaryPassword();
    expect(password).toHaveLength(14);
    expect(password).not.toMatch(/[0O1lI]/);
    expect(groupForReading('AbCdEfGhJk')).toBe('AbCd EfGh Jk');
  });
});

it('creates a merchant and shows the temporary password once to hand over', async () => {
  jest.mocked(createMerchant).mockResolvedValue(merchant);
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<MerchantsScreen />); });
  await act(async () => {
    field(root, 'Nombre del negocio').props.onChangeText('Comercial Huanta');
    field(root, 'Usuario del Mayorista').props.onChangeText('huanta');
  });
  await act(async () => { button(root, 'Generar contraseña').props.onPress(); });
  const password = field(root, 'Contraseña temporal').props.value as string;
  expect(password).toHaveLength(14);
  await act(async () => { button(root, 'Crear comerciante').props.onPress(); });
  expect(createMerchant).toHaveBeenCalledWith('admin-token', expect.objectContaining({ businessName: 'Comercial Huanta', temporaryPassword: password, username: 'huanta' }));
  expect(host(root, (props) => props.title === 'Entrega estos datos al Mayorista')).toHaveLength(1);
  await act(async () => { button(root, 'Ya la entregué').props.onPress(); });
  expect(host(root, (props) => props.title === 'Entrega estos datos al Mayorista')).toHaveLength(0);
});

it('asks for a reason, confirms and reuses the operation id after a lost connection', async () => {
  jest.mocked(suspendMerchant).mockRejectedValueOnce(new ApiUnavailableError()).mockResolvedValueOnce({ ...merchant, isActive: false });
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<MerchantsScreen />); });
  await act(async () => { button(root, 'Ver soporte').props.onPress(); });
  await act(async () => { button(root, 'Suspender').props.onPress(); });
  expect(suspendMerchant).not.toHaveBeenCalled();
  expect(host(root, (props) => typeof props.message === 'string' && props.message.includes('motivo'))).not.toHaveLength(0);

  await act(async () => { field(root, 'Motivo').props.onChangeText('Falta de pago'); });
  for (let attempt = 0; attempt < 2; attempt++) {
    await act(async () => { button(root, 'Suspender').props.onPress(); });
    const dialog = host(root, (props) => props.title === '¿Suspender el comerciante?')[0]!;
    await act(async () => { (dialog.props.onConfirm as () => void)(); });
  }
  const [first, second] = jest.mocked(suspendMerchant).mock.calls;
  expect(first![2].clientOperationId).toBe(second![2].clientOperationId);
  expect(second![2].reason).toBe('Falta de pago');
});

it('renders nothing for a business user', async () => {
  mockRole = 'wholesaler';
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<MerchantsScreen />); });
  expect(root.toJSON()).toBeNull();
});
