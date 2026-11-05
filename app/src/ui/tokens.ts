// MAÑAY (spec 011): values of the Stitch design system (DESIGN.md), light
// theme only, chosen for high contrast under direct sunlight. Text pairs are
// checked against WCAG in tests/ui/contrast.test.ts.
export const color = {
  brand: '#1F3A2F',
  brandMuted: '#E3EDE7',
  surface: '#F9FAFB',
  surfaceRaised: '#FFFFFF',
  textPrimary: '#0B1C30',
  textSecondary: '#475569',
  textOnBrand: '#FFFFFF',
  border: '#CBD5E1',
  danger: '#991B1B',
  dangerMuted: '#FEF2F2',
  dangerAccent: '#EF4444',
  success: '#065F46',
  successMuted: '#ECFDF5',
  successAccent: '#10B981',
  warning: '#92400E',
  warningMuted: '#FFFBEB',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const layout = {
  tabletMinWidth: 768,
  contentMaxWidth: 1120,
  formMaxWidth: 480,
} as const;

export const typography = {
  eyebrow: { fontSize: 14, lineHeight: 20, fontWeight: '700' as const, letterSpacing: 1.2 },
  title: { fontSize: 34, lineHeight: 42, fontWeight: '700' as const },
  body: { fontSize: 18, lineHeight: 27, fontWeight: '400' as const },
  bodySmall: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
} as const;
