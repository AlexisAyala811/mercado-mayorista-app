import { useRouter, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { backOrHome } from '@/navigation/back-or-home';
import { AppButton } from '@/ui/components/app-button';
import { spacing } from '@/ui/tokens';
import { useVisualStyles, type VisualPalette } from '@/ui/visual-theme';
import { useAppChrome } from './app-chrome';

// Spec 011 (RQ-ST02, CL-ST07): the bar fixed at the bottom of every screen
// after sign-in. «Atrás» and «Menú principal» always; the step action of a
// purchase or a sale takes the «Siguiente» place.
export function BottomNav() {
  const chrome = useAppChrome();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useVisualStyles(createStyles);
  const slots = chrome?.slots ?? {};
  const back = () => {
    if (!chrome?.press('back')) backOrHome(router);
  };
  const home = () => {
    if (!chrome?.press('home')) router.replace('/home' as Href);
  };
  return (
    <View accessibilityRole="toolbar" style={[styles.bar, { paddingBottom: spacing.sm + insets.bottom }]} testID="bottom-nav">
      <AppButton
        accessibilityLabel={slots.back?.accessibilityLabel ?? 'Atrás'}
        disabled={slots.back?.disabled}
        label={slots.back?.label ?? 'Atrás'}
        onPress={back}
        tone="secondary"
      />
      <AppButton
        accessibilityLabel={slots.home?.accessibilityLabel ?? 'Menú principal'}
        disabled={slots.home?.disabled}
        label={slots.home?.label ?? 'Menú principal'}
        onPress={home}
      />
      {slots.next ? (
        <AppButton
          accessibilityLabel={slots.next.accessibilityLabel ?? slots.next.label}
          disabled={slots.next.disabled}
          label={slots.next.label}
          onPress={() => chrome?.press('next')}
          tone="secondary"
        />
      ) : null}
    </View>
  );
}

const createStyles = (color: VisualPalette) =>
  StyleSheet.create({
    bar: {
      alignItems: 'center',
      backgroundColor: color.surfaceRaised,
      borderColor: color.border,
      borderTopWidth: 1,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
    },
  });
