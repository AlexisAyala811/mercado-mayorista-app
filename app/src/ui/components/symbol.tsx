import { SymbolView as ExpoSymbolView, type SymbolViewProps } from 'expo-symbols';
import { useWindowDimensions } from 'react-native';

// Spec 011 (T1190): Android draws the Material symbols as text, so the system
// font size cut the glyph out of its box at 200 %. The glyph is
// drawn at its size divided by the font scale, in a box of the original size:
// it stays whole, a little smaller than the enlarged text around it.
export function SymbolView({ size = 24, style, ...props }: SymbolViewProps) {
  const { fontScale } = useWindowDimensions();
  if (fontScale <= 1) return <ExpoSymbolView {...props} size={size} style={style} />;
  return <ExpoSymbolView {...props} size={size / fontScale} style={[{ height: size, width: size }, style]} />;
}
