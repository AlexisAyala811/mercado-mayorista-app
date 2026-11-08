import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppChromeProvider } from '@/ui/navigation/app-chrome';
import { BottomNav } from '@/ui/navigation/bottom-nav';

// Spec 011 (RQ-ST02): screens no longer draw «Volver» or «Menú»; tests mount
// them with the shared chrome and press the bottom bar instead.
export function withChrome(screen: ReactElement, username = 'mayorista') {
  return (
    <SafeAreaProvider initialMetrics={metrics}>
      <AppChromeProvider username={username}>
        {screen}
        <BottomNav />
      </AppChromeProvider>
    </SafeAreaProvider>
  );
}

type Node = { props: Record<string, unknown> };
type Root = { root: { findAll: (predicate: (node: Node) => boolean) => Node[] } };

const metrics = { frame: { height: 800, width: 1280, x: 0, y: 0 }, insets: { bottom: 0, left: 0, right: 0, top: 0 } };

// The pressable of the bottom bar with the given label or accessibility label.
export function barButton(root: Root, label: string) {
  const bar = root.root.findAll((node) => node.props.testID === 'bottom-nav')[0] as unknown as Root['root'] | undefined;
  if (!bar) throw new Error('Bottom bar not rendered');
  const found = bar.findAll((node) => typeof node.props.onPress === 'function' && (node.props.label === label || node.props.accessibilityLabel === label));
  if (!found[0]) throw new Error(`No bottom bar button ${label}`);
  return found[0] as unknown as { props: { onPress: () => void; disabled?: boolean; label?: string } };
}
