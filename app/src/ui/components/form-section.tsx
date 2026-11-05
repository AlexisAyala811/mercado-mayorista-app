import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppCard } from '@/ui/components/app-card';
import { layout, spacing } from '@/ui/tokens';

type FormSectionProps = {
  children: ReactNode;
  description?: string;
  footer?: ReactNode;
  style?: StyleProp<ViewStyle>;
  title: string;
};

export function FormSection({ children, description, footer, style, title }: FormSectionProps) {
  return (
    <AppCard description={description} style={[styles.card, style]} title={title}>
      <View style={styles.fields}>{children}</View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: { maxWidth: layout.formMaxWidth, width: '100%' },
  fields: { gap: spacing.md },
  footer: { gap: spacing.sm },
});
