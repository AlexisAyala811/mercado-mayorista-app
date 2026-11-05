import { Image } from 'expo-image';
import { View } from 'react-native';

const sources = {
  back: require('../../../assets/figma/original/reports/arrow-left.svg'),
  calendar: require('../../../assets/figma/original/reports/calendar-days.svg'),
  chevron: require('../../../assets/figma/original/reports/chevron-down.svg'),
  search: require('../../../assets/figma/original/reports/search.svg'),
  document: require('../../../assets/figma/original/reports/file-text.svg'),
  consult: require('../../../assets/figma/original/reports/eye.svg'),
  download: require('../../../assets/figma/original/reports/download.svg'),
};
// Intrinsic exported dimensions: file-text 20×20; eye/download 16×16.
export function ReportAsset({ kind }: { kind: keyof typeof sources }) {
  const size = kind === 'document' || kind === 'back' ? 20 : kind === 'calendar' || kind === 'chevron' || kind === 'search' ? 18 : 16;
  return <View accessible={false} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    pointerEvents="none" style={{ width: size, height: size }} testID={`report-${kind}-icon`}>
    <Image source={sources[kind]} contentFit="contain" accessibilityElementsHidden style={{ width: size, height: size }} />
  </View>;
}
