import { accent, color } from '@/ui/tokens';
import { reportVisual } from '@/ui/report-tokens';

// Spec 011: the tablet is used mostly under direct sunlight, so every text
// pair meets WCAG AA (4.5:1) and amounts, balances and states meet AAA (7:1).
function luminance(hex: string) {
  const channels = [1, 3, 5].map((start) => {
    const value = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

export function contrast(foreground: string, background: string) {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (light! + 0.05) / (dark! + 0.05);
}

describe('MAÑAY contrast', () => {
  it('computes the WCAG ratio of known pairs', () => {
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrast('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
  });

  it.each([
    ['primary text on the canvas', color.textPrimary, color.surface],
    ['primary text on cards', color.textPrimary, color.surfaceRaised],
    ['brand text on cards', color.brand, color.surfaceRaised],
    ['text on the brand colour', color.textOnBrand, color.brand],
    ['light brand text on the brand colour', color.brandMuted, color.brand],
    ['paid state', color.success, color.successMuted],
    ['debt state', color.danger, color.dangerMuted],
    ['report values', reportVisual.value, reportVisual.surface],
  ])('keeps %s at AAA', (_pair, foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(7);
  });

  it.each([
    ['secondary text on the canvas', color.textSecondary, color.surface],
    ['secondary text on cards', color.textSecondary, color.surfaceRaised],
    ['brand text on its muted tint', color.brand, color.brandMuted],
    ['warning state', color.warning, color.warningMuted],
    ['report titles', reportVisual.title, reportVisual.surface],
    ['report details', reportVisual.secondary, reportVisual.surface],
  ])('keeps %s at AA', (_pair, foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  // Spec 011 (RQ-ST10): accent families taken from the Stitch mockups.
  it.each(Object.entries(accent))('keeps the %s accent readable on its tint, its pill and white', (_name, family) => {
    expect(contrast(family.ink, family.tint)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(family.ink, '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
    expect(contrast(family.pillInk, family.pill)).toBeGreaterThanOrEqual(4.5);
  });
});
