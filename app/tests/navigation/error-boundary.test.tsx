import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';

import { ErrorBoundary } from '@/app/_layout';

jest.mock('expo-router', () => ({ Stack: () => null, usePathname: () => '/', useRouter: () => ({ push: jest.fn() }) }));
jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('@/features/auth/session/session-provider', () => ({ SessionProvider: ({ children }: { children: unknown }) => children, useSession: () => ({ session: null }) }));
jest.mock('@/features/sync/sync-queue-provider', () => ({ SyncQueueProvider: ({ children }: { children: unknown }) => children }));
jest.mock('@/features/sync/use-sync-status', () => ({ useSyncStatus: () => null }));
jest.mock('@/features/reception/use-initial-purchase-draft-session', () => ({ useInitialPurchaseDraftSession: () => undefined }));

// Spec 011, CL-ST36: a failure while drawing a screen shows a way back.
it('shows what happened and retries the route', async () => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const retry = jest.fn(async () => undefined);
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<ErrorBoundary error={new Error('boom')} retry={retry} />); });
  const texts = root.root.findAll((node) => node.type === Text).map((node) => [node.props.children].flat().join(''));
  expect(texts).toEqual(expect.arrayContaining(['Algo falló en esta pantalla']));
  expect(texts.join(' ')).not.toContain('boom');
  await act(async () => { root.root.findAll((node) => node.props.accessibilityRole === 'button' && typeof node.props.onPress === 'function')[0]!.props.onPress(); });
  expect(retry).toHaveBeenCalledTimes(1);
  await act(async () => root.unmount());
});
