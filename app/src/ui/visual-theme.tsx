import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { color, radius } from '@/ui/tokens';

export type VisualPalette = { [Key in keyof typeof color]: string } & {
  controlSurface?: string;
  cornerRadius?: number;
  fieldBorderWidth?: number;
};

// Spec 011: purchases and the menu use the MAÑAY theme. These providers stay
// as variants (form controls, card radius) so screens keep their structure
// while they are redesigned one by one.
export const purchasePalette: VisualPalette = {
  ...color,
  controlSurface: color.surfaceRaised,
  cornerRadius: radius.sm,
  fieldBorderWidth: 1,
};

const VisualThemeContext = createContext<VisualPalette>(color);

export function PurchaseVisualTheme({ children }: { children: ReactNode }) {
  return <VisualThemeContext.Provider value={purchasePalette}>{children}</VisualThemeContext.Provider>;
}

const menuPalette: VisualPalette = { ...purchasePalette, border: '#E2E8F0', cornerRadius: radius.lg };
export function MenuVisualTheme({ children }: { children: ReactNode }) {
  return <VisualThemeContext.Provider value={menuPalette}>{children}</VisualThemeContext.Provider>;
}

export function useVisualStyles<Styles>(createStyles: (palette: VisualPalette) => Styles): Styles {
  const palette = useContext(VisualThemeContext);
  return useMemo(() => createStyles(palette), [createStyles, palette]);
}

export function useVisualPalette(): VisualPalette {
  return useContext(VisualThemeContext);
}
