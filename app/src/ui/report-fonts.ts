import { useFonts } from 'expo-font';
const fonts = {
  ReportInterMedium: require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'),
  ReportRalewayExtraBold: require('@expo-google-fonts/raleway/800ExtraBold/Raleway_800ExtraBold.ttf'),
  ReportRalewayBold: require('@expo-google-fonts/raleway/700Bold/Raleway_700Bold.ttf'),
  ReportInterSemiBold: require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
  ReportInterRegular: require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
};
export function useReportFonts() { const [loaded] = useFonts(fonts); return loaded; }
