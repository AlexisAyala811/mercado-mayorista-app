// MAÑAY (spec 011): values of the Stitch design system (DESIGN.md), light
// theme only, chosen for high contrast under direct sunlight. Text pairs are
// checked against WCAG in tests/ui/contrast.test.ts.
export const color = {
  brand: '#1F3A2F',
  brandMuted: '#E3EDE7',
  surface: '#F8F9FF',
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

// Spec 011 (RQ-ST10): accent families of the Stitch mockups (Tailwind 50, 200,
// 700, 100 and 800 of each hue). ink on tint and pillInk on pill meet
// WCAG AA; emerald uses 700 instead of the mockup's 500, which does not.
export const accent = {
  emerald: { tint: '#ECFDF5', line: '#A7F3D0', ink: '#047857', pill: '#D1FAE5', pillInk: '#065F46' },
  amber: { tint: '#FFFBEB', line: '#FDE68A', ink: '#B45309', pill: '#FEF3C7', pillInk: '#92400E' },
  sky: { tint: '#F0F9FF', line: '#BAE6FD', ink: '#0369A1', pill: '#E0F2FE', pillInk: '#075985' },
  indigo: { tint: '#EEF2FF', line: '#C7D2FE', ink: '#4338CA', pill: '#E0E7FF', pillInk: '#3730A3' },
  rose: { tint: '#FFF1F2', line: '#FECDD3', ink: '#BE123C', pill: '#FFE4E6', pillInk: '#9F1239' },
  teal: { tint: '#F0FDFA', line: '#99F6E4', ink: '#0F766E', pill: '#CCFBF1', pillInk: '#115E59' },
  purple: { tint: '#FAF5FF', line: '#E9D5FF', ink: '#7E22CE', pill: '#F3E8FF', pillInk: '#6B21A8' },
  slate: { tint: '#F8FAFC', line: '#E2E8F0', ink: '#334155', pill: '#E2E8F0', pillInk: '#1E293B' },
} as const;
export type AccentName = keyof typeof accent;

// Card of the mockups: 2 px slate-200 border, 16 px radius and the soft
// "touch" shadow.
export const card = {
  borderColor: '#E2E8F0',
  borderWidth: 2,
  boxShadow: '0px 4px 14px rgba(31,58,47,0.08)',
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
  contentMaxWidth: 1280,
  formMaxWidth: 480,
} as const;

export const typography = {
  eyebrow: { fontSize: 14, lineHeight: 20, fontWeight: '700' as const, letterSpacing: 1.2 },
  title: { fontSize: 34, lineHeight: 42, fontWeight: '700' as const },
  body: { fontSize: 18, lineHeight: 27, fontWeight: '400' as const },
  bodySmall: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
} as const;
