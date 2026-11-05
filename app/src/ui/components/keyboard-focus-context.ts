import { createContext } from 'react';
import type { TextInput } from 'react-native';

export const KeyboardFocusContext = createContext<{
  blur: (input: TextInput | null) => void;
  focus: (input: TextInput | null) => void;
} | null>(null);
