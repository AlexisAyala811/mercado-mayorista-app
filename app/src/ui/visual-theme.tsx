import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { color } from '@/ui/tokens';

export type VisualPalette = { [Key in keyof typeof color]: string } & {
  controlSurface?: string;
  cornerRadius?: number;
  fieldBorderWidth?: number;
};

// COMPRA (1:346): values from the Figma design context, scoped to purchases.
export const purchasePalette: VisualPalette = {
  ...color,
  brand: '#2C2C2C',
  brandMuted: '#D9D9D9',
  surface: '#FFFFFF',
  surfaceRaised: '#F4F4F4',
  textPrimary: '#000000',
  textSecondary: '#454545',
  border: '#000000',
  controlSurface: '#D9D9D9',
  cornerRadius: 10,
  fieldBorderWidth: 0,
};

const VisualThemeContext = createContext<VisualPalette>(color);

export function PurchaseVisualTheme({ children }: { children: ReactNode }) {
  return <VisualThemeContext.Provider value={purchasePalette}>{children}</VisualThemeContext.Provider>;
}

const menuPalette: VisualPalette = { ...purchasePalette, surfaceRaised: '#E3E3E3', border: '#D9D9D9', cornerRadius: 20 };
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
