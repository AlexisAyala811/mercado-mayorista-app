import { useVisualStyles, type VisualPalette } from "@/ui/visual-theme";
import { useMemo, useRef, type ReactNode } from "react";
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { layout, spacing } from "@/ui/tokens";
import { KeyboardFocusContext } from "./keyboard-focus-context";
import { useKeyboardScrollFocus } from "./use-keyboard-scroll-focus";

type AppScreenProps = {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollable?: boolean;
  testID?: string;
  showsVerticalScrollIndicator?: boolean;
  edgeToEdge?: boolean;
};

export function AppScreen({
  children,
  contentContainerStyle,
  scrollable = true,
  testID,
  showsVerticalScrollIndicator,
  edgeToEdge = false,
}: AppScreenProps) {
  const styles = useVisualStyles(createStyles);
  const { width } = useWindowDimensions();
  const horizontalPadding =
    width >= layout.tabletMinWidth ? spacing.xl : spacing.lg;
  const responsiveStyle = {
    paddingHorizontal: edgeToEdge ? 0 : horizontalPadding,
  };
  const contentStyle = edgeToEdge
    ? { maxWidth: "100%" as const, paddingVertical: 0 }
    : null;
  const scrollRef = useRef<ScrollView>(null);
  const scrollAdapter = useMemo(
    () => ({
      getViewport: () => scrollRef.current?.getNativeScrollRef() ?? null,
      scrollTo: (offset: number) =>
        scrollRef.current?.scrollTo({ y: offset, animated: true }),
    }),
    [],
  );
  const {
    keyboardFocus,
    keyboardInset,
    measureKeyboardOcclusion,
    onScroll,
    revealFocusedInput,
  } = useKeyboardScrollFocus(scrollAdapter, scrollable);

  if (!scrollable) {
    return (
      <SafeAreaView style={styles.safeArea} testID={testID}>
        <View style={[styles.viewport, responsiveStyle]}>
          <View style={[styles.content, contentStyle, contentContainerStyle]}>
            {children}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} testID={testID}>
      <KeyboardFocusContext.Provider value={keyboardFocus}>
        <ScrollView
          showsVerticalScrollIndicator={showsVerticalScrollIndicator}
          ref={scrollRef}
          onLayout={measureKeyboardOcclusion}
          onContentSizeChange={revealFocusedInput}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[
            styles.scrollContent,
            responsiveStyle,
            { paddingBottom: keyboardInset },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.content, contentStyle, contentContainerStyle]}>
            {children}
          </View>
        </ScrollView>
      </KeyboardFocusContext.Provider>
    </SafeAreaView>
  );
}

const createStyles = (color: VisualPalette) =>
  StyleSheet.create({
    safeArea: { backgroundColor: color.surface, flex: 1 },
    viewport: { alignItems: "center", flex: 1 },
    scrollContent: { alignItems: "center", flexGrow: 1 },
    content: {
      flexGrow: 1,
      paddingVertical: spacing.xl,
      width: "100%",
      maxWidth: layout.contentMaxWidth,
    },
  });
