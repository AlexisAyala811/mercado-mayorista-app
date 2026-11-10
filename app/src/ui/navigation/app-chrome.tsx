import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { NavigationContext } from 'expo-router/react-navigation';

// Spec 011 (RQ-ST02, RQ-ST03): the chrome every authenticated screen shares.
// The root layout provides the user shown in the header and draws the bottom
// bar; a screen only declares a different «Atrás» or its step action.

export type ChromeAction = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
};

type ActionView = Omit<ChromeAction, 'onPress'>;
type SlotName = 'back' | 'home' | 'next';
type Slots = Partial<Record<SlotName, ActionView>>;
type Handlers = Partial<Record<SlotName, () => void>>;
const slotNames: SlotName[] = ['back', 'home', 'next'];

// Two contexts: screens register through a stable one, so a change of the
// slots re-renders the bar and the header but never the registering screen.
type Registry = {
  press: (slot: keyof Slots) => boolean;
  register: (owner: symbol, slots: Slots, handlers: Handlers) => void;
  release: (owner: symbol) => void;
};
// Spec 011 (CL-ST18): what the Stitch header shows next to the user: the
// role and the state of the local queue, which opens «Pendientes de envío».
export type ChromeConnection = { tone: 'ok' | 'pending' | 'warning'; title: string; detail: string; accessibilityLabel: string; onPress?: () => void };
type ChromeView = { username: string | null; role: string | null; connection: ChromeConnection | null; slots: Slots };

const RegistryContext = createContext<Registry | null>(null);
const ViewContext = createContext<ChromeView | null>(null);
// Unit tests may replace expo-router/react-navigation without NavigationContext.
const noNavigation = createContext<undefined>(undefined);

export function AppChromeProvider({ children, connection = null, role = null, username }: { children: ReactNode; connection?: ChromeConnection | null; role?: string | null; username: string | null }) {
  const [state, setState] = useState<{ owner: symbol | null; slots: Slots }>({ owner: null, slots: {} });
  const handlers = useRef<Handlers>({});
  const owner = useRef<symbol | null>(null);
  const register = useCallback((who: symbol, slots: Slots, next: Handlers) => {
    owner.current = who;
    handlers.current = next;
    setState((current) => (current.owner === who && sameSlots(current.slots, slots) ? current : { owner: who, slots }));
  }, []);
  const release = useCallback((who: symbol) => {
    if (owner.current !== who) return;
    owner.current = null;
    handlers.current = {};
    setState({ owner: null, slots: {} });
  }, []);
  const press = useCallback((slot: keyof Slots) => {
    const handler = handlers.current[slot];
    if (!handler) return false;
    handler();
    return true;
  }, []);
  const registry = useMemo(() => ({ press, register, release }), [press, register, release]);
  const view = useMemo(() => ({ connection, role, slots: state.slots, username }), [connection, role, state.slots, username]);
  return (
    <RegistryContext.Provider value={registry}>
      <ViewContext.Provider value={view}>{children}</ViewContext.Provider>
    </RegistryContext.Provider>
  );
}

// For the bar and the header: the declared slots, the user and how to press.
export function useAppChrome() {
  const registry = useContext(RegistryContext);
  const view = useContext(ViewContext);
  return registry && view ? { ...view, press: registry.press } : null;
}

// A screen with steps declares its own «Atrás» and its step action, which the
// bottom bar shows in the «Siguiente» place. Handlers may change every render;
// the bar only re-renders when a label or a disabled state changes.
export function useBottomNav(options: Partial<Record<SlotName, ChromeAction | null>>) {
  const chrome = useContext(RegistryContext);
  const [owner] = useState(() => Symbol('screen'));
  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  });
  const key = slotNames.map((name) => (options[name] ? viewKey(options[name]) : '')).join('/');
  // Stack keeps earlier screens mounted, so a screen speaks only while
  // focused. Outside a navigator (unit tests) it counts as focused.
  const navigation = useContext(NavigationContext ?? noNavigation);
  const [focused, setFocused] = useState(() => navigation?.isFocused() ?? true);
  useEffect(() => {
    if (!navigation) return undefined;
    const offFocus = navigation.addListener('focus', () => setFocused(true));
    const offBlur = navigation.addListener('blur', () => setFocused(false));
    return () => {
      offFocus();
      offBlur();
    };
  }, [navigation]);
  useEffect(() => {
    // A screen that declares nothing keeps the bar of the screen around it.
    if (!chrome || !focused || !key.replaceAll('/', '')) return undefined;
    const slots: Slots = {};
    const handlers: Handlers = {};
    for (const name of slotNames) {
      const action = latest.current[name];
      if (!action) continue;
      slots[name] = viewOf(action);
      handlers[name] = () => latest.current[name]?.onPress();
    }
    chrome.register(owner, slots, handlers);
    return () => chrome.release(owner);
    // key stands for the labels and disabled states of the declared slots.
  }, [chrome, focused, owner, key]);
}

function viewOf(action: ChromeAction): ActionView {
  return { accessibilityLabel: action.accessibilityLabel, disabled: action.disabled, label: action.label };
}

function viewKey(action: ChromeAction) {
  return `${action.label}|${action.accessibilityLabel ?? ''}|${action.disabled ? 1 : 0}`;
}

function sameSlots(left: Slots, right: Slots) {
  return slotNames.every((name) => {
    const a = left[name];
    const b = right[name];
    return (a ? viewKey({ ...a, onPress: noop }) : '') === (b ? viewKey({ ...b, onPress: noop }) : '');
  });
}

function noop() {}

// For a screen that renders different layouts behind early returns: each
// layout mounts this component instead of calling the hook conditionally.
export function BottomNavSlots(props: Partial<Record<SlotName, ChromeAction | null>>) {
  useBottomNav(props);
  return null;
}
