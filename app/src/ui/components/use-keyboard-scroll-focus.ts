import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Platform, type NativeScrollEvent, type NativeSyntheticEvent, type TextInput, type View } from 'react-native';

import { spacing } from '@/ui/tokens';

type ScrollAdapter = {
  getViewport: () => Pick<View, 'measureInWindow'> | null;
  scrollTo: (offset: number) => void;
};

export function useKeyboardScrollFocus(adapter: ScrollAdapter, enabled = true) {
  const focusedInput = useRef<TextInput | null>(null);
  const keyboardTop = useRef<number | null>(null);
  const scrollOffset = useRef(0);
  const pendingFrame = useRef<number | null>(null);
  const [keyboardInset, setKeyboardInset] = useState(0);

  const revealFocusedInput = useCallback(() => {
    if (Platform.OS === 'web' || keyboardTop.current === null || !focusedInput.current) return;
    if (pendingFrame.current !== null) cancelAnimationFrame(pendingFrame.current);
    pendingFrame.current = requestAnimationFrame(() => {
      pendingFrame.current = null;
      const input = focusedInput.current;
      const viewport = adapter.getViewport();
      if (!input || !viewport) return;
      viewport.measureInWindow((_x, viewportY, _width, viewportHeight) => {
        input.measureInWindow((_inputX, inputY, _inputWidth, inputHeight) => {
          if (input !== focusedInput.current || keyboardTop.current === null) return;
          const bottom = Math.min(viewportY + viewportHeight, keyboardTop.current);
          const overflow = inputY + inputHeight + spacing.md - bottom;
          const above = inputY - viewportY - spacing.md;
          const delta = overflow > 0 ? overflow : above < 0 ? above : 0;
          if (Math.abs(delta) > 1) adapter.scrollTo(Math.max(0, scrollOffset.current + delta));
        });
      });
    });
  }, [adapter]);

  const measureKeyboardOcclusion = useCallback(() => {
    const top = keyboardTop.current;
    if (top === null || Platform.OS === 'web') return;
    adapter.getViewport()?.measureInWindow((_x, y, _width, height) => {
      if (keyboardTop.current !== top) return;
      // Android can overlay the keyboard without resizing the viewport.
      // Additional space lets the last fields scroll into the visible area.
      setKeyboardInset(Math.max(0, y + height - top));
      revealFocusedInput();
    });
  }, [adapter, revealFocusedInput]);

  useEffect(() => {
    if (!enabled || Platform.OS === 'web') return;
    keyboardTop.current = Keyboard.metrics()?.screenY ?? null;
    measureKeyboardOcclusion();
    const shown = Keyboard.addListener('keyboardDidShow', (event) => {
      keyboardTop.current = event.endCoordinates.screenY;
      measureKeyboardOcclusion();
    });
    const hidden = Keyboard.addListener('keyboardDidHide', () => { keyboardTop.current = null; setKeyboardInset(0); });
    return () => {
      shown.remove();
      hidden.remove();
      focusedInput.current = null;
      keyboardTop.current = null;
      if (pendingFrame.current !== null) cancelAnimationFrame(pendingFrame.current);
    };
  }, [enabled, measureKeyboardOcclusion]);

  const focus = useCallback((input: TextInput | null) => {
    focusedInput.current = input;
    if (Platform.OS !== 'web') keyboardTop.current = Keyboard.metrics()?.screenY ?? null;
    revealFocusedInput();
  }, [revealFocusedInput]);
  const blur = useCallback((input: TextInput | null) => {
    if (focusedInput.current === input) focusedInput.current = null;
  }, []);
  const keyboardFocus = useMemo(() => ({ focus, blur }), [focus, blur]);
  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffset.current = event.nativeEvent.contentOffset.y;
  }, []);

  return { keyboardFocus, keyboardInset, measureKeyboardOcclusion, onScroll, revealFocusedInput };
}
