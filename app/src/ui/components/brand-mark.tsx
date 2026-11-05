import { Image } from 'expo-image';

const logo = require('../../../assets/brand/manay-logo.png');

type BrandMarkProps = { size?: number };

// MAÑAY logo (spec 011, CL-MD01): the only place that draws the brand, so a
// new logo file changes every screen at once.
export function BrandMark({ size = 96 }: BrandMarkProps) {
  return (
    <Image
      accessibilityLabel="MAÑAY"
      accessibilityRole="image"
      accessible
      contentFit="contain"
      source={logo}
      style={{ height: size, width: size }}
      testID="brand-mark"
    />
  );
}
