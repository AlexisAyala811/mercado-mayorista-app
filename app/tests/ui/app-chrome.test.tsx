import { Text } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { AppHeader } from '@/ui/navigation/app-header';
import { BottomNavSlots, useBottomNav } from '@/ui/navigation/app-chrome';
import { barButton, withChrome } from '../shared/with-chrome';

const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, canGoBack: () => mockCanGoBack, replace: mockReplace }),
}));

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  mockBack.mockReset();
  mockReplace.mockReset();
  mockCanGoBack = true;
});

async function render(node: React.ReactElement) {
  let root!: ReactTestRenderer;
  await act(async () => {
    root = create(withChrome(node, 'mayorista'));
  });
  return root;
}

function texts(root: ReactTestRenderer) {
  return root.root.findAll((node) => node.type === Text).map((node) => [node.props.children].flat().join(''));
}

// Spec 011 (RQ-ST02, CL-ST07).
describe('bottom bar', () => {
  it('goes back, or to the menu when there is no previous screen, and always offers the menu', async () => {
    const root = await render(<Text>Pantalla</Text>);
    await act(async () => barButton(root, 'Atrás').props.onPress());
    expect(mockBack).toHaveBeenCalledTimes(1);
    mockCanGoBack = false;
    await act(async () => barButton(root, 'Atrás').props.onPress());
    expect(mockReplace).toHaveBeenLastCalledWith('/home');
    await act(async () => barButton(root, 'Menú principal').props.onPress());
    expect(mockReplace).toHaveBeenCalledTimes(2);
    expect(root.root.findAll((node) => node.props.label === 'Siguiente')).toHaveLength(0);
  });

  it('uses the step back and the step action a screen declares, with their disabled state', async () => {
    const stepBack = jest.fn();
    const review = jest.fn();
    function Step({ busy }: { busy: boolean }) {
      useBottomNav({
        back: { accessibilityLabel: 'Volver a datos', label: 'Atrás', onPress: stepBack },
        next: { disabled: busy, label: 'Revisar y cerrar pesaje', onPress: review },
      });
      return null;
    }
    let root!: ReactTestRenderer;
    await act(async () => {
      root = create(withChrome(<Step busy />));
    });
    expect(barButton(root, 'Revisar y cerrar pesaje').props.disabled).toBe(true);
    await act(async () => {
      root.update(withChrome(<Step busy={false} />));
    });
    expect(barButton(root, 'Revisar y cerrar pesaje').props.disabled).toBe(false);
    await act(async () => barButton(root, 'Revisar y cerrar pesaje').props.onPress());
    await act(async () => barButton(root, 'Volver a datos').props.onPress());
    expect(review).toHaveBeenCalledTimes(1);
    expect(stepBack).toHaveBeenCalledTimes(1);
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('keeps the bar of the surrounding screen when a nested part declares nothing, and restores the default on unmount', async () => {
    const review = jest.fn();
    function Flow({ nested, mounted = true }: { nested: boolean; mounted?: boolean }) {
      return (
        <>
          {mounted ? <BottomNavSlots next={{ label: 'Confirmar liquidación', onPress: review }} /> : null}
          {nested ? <BottomNavSlots back={null} next={null} /> : null}
        </>
      );
    }
    let root!: ReactTestRenderer;
    await act(async () => {
      root = create(withChrome(<Flow nested />));
    });
    expect(barButton(root, 'Confirmar liquidación')).toBeTruthy();
    await act(async () => {
      root.update(withChrome(<Flow nested mounted={false} />));
    });
    expect(root.root.findAll((node) => node.props.label === 'Confirmar liquidación')).toHaveLength(0);
  });
});

// Spec 011 (RQ-ST03).
describe('header', () => {
  it('shows the logo, the eyebrow, the title as a header and the signed-in user', async () => {
    const root = await render(<AppHeader eyebrow="VENTA · COBRANZAS" title="Cobranzas" />);
    expect(root.root.findAll((node) => node.props.testID === 'brand-mark').length).toBeGreaterThan(0);
    expect(texts(root)).toEqual(expect.arrayContaining(['VENTA · COBRANZAS', 'Cobranzas', 'mayorista']));
    expect(root.root.findAll((node) => node.type === Text && node.props.accessibilityRole === 'header')[0]!.props.children).toBe('Cobranzas');
    expect(root.root.findAll((node) => node.props.accessibilityLabel === 'Usuario: mayorista').length).toBeGreaterThan(0);
  });
});
