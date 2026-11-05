import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

// Original Figma vector: MENU 1:137 and Carros 18:462 have identical bytes.
// COMPRA 1:352 retains its own original export with the same intrinsic geometry.
// The 36×40.5 vector in the 54×54 instance has 2 px of stroke overflow.
export function OriginalUserIcon({ style, variant='menu' }: { style?: StyleProp<ViewStyle>;variant?:'menu'|'purchase'|'report' }) {
  return (
    <View
      accessible={false}
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[variant === 'report' ? styles.reportInstance : styles.instance, style]}
      testID="original-user-icon"
    >
      <Image
        source={variant==='report'?require('../../../assets/figma/original/user/report-instance.png'):variant==='purchase'?require('../../../assets/figma/original/user/compra-icon.svg'):require('../../../assets/figma/original/user/menu-icon.svg')}
        contentFit="contain"
        accessibilityElementsHidden
        style={variant === 'report' ? styles.reportInstance : styles.vector}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  reportInstance: {width:54,height:54},
  instance: { width: 54, height: 54 },
  vector: { position: 'absolute', left: 7, top: 4.75, width: 40, height: 44.5 },
});
