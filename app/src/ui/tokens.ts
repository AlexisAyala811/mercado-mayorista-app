export const color = {
  brand: '#244234',
  brandMuted: '#E8EFE5',
  surface: '#F7F8F5',
  surfaceRaised: '#FFFFFF',
  textPrimary: '#1F2A23',
  textSecondary: '#526057',
  textOnBrand: '#FFFFFF',
  border: '#AAB6AC',
  danger: '#B42318',
  dangerMuted: '#FEE4E2',
  success: '#287A43',
  successMuted: '#E3F5E8',
  warning: '#9A6700',
  warningMuted: '#FFF1C2',
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
