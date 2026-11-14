import { StyleSheet, Text, View } from 'react-native';

import { ModuleCard } from '@/features/home/components/module-card';
import type { MenuFacts } from '@/features/home/menu-facts';
import { menuSections, type MenuModule } from '@/features/home/menu-modules';
import { AppButton, AppScreen, BrandMark, EmptyState } from '@/ui/components';
import { color, radius, spacing, typography } from '@/ui/tokens';

export type HomeScreenProps = {
  facts?: MenuFacts;
  modules: MenuModule[];
  onLogout?: () => void;
  onOpenModule?: (module: MenuModule) => void;
  roleLabel: string;
  userDisplayName: string;
};

// MAÑAY menu (spec 011): every section the profile allows is visible at once.
export function HomeScreen({ facts = {}, modules, onLogout, onOpenModule, roleLabel, userDisplayName }: HomeScreenProps) {
  const sections = menuSections
    .map((section) => ({ ...section, modules: modules.filter((module) => module.section === section.id) }))
    .filter((section) => section.modules.length > 0);

  return (
    <AppScreen contentContainerStyle={styles.screen} testID="home-screen">
      <View style={styles.header}>
        <View style={styles.brand}>
          <BrandMark size={56} />
          <Text accessibilityRole="header" accessibilityLabel={`Menú principal de MAÑAY. Usuario ${userDisplayName}`} style={styles.brandName}>
            MAÑAY
          </Text>
        </View>
        <View style={styles.account}>
          <View style={styles.identity}>
            <Text numberOfLines={1} style={styles.user}>{userDisplayName}</Text>
            <Text style={styles.role}>{roleLabel}</Text>
          </View>
          {onLogout ? <AppButton label="Cerrar sesión" onPress={onLogout} tone="secondary" /> : null}
        </View>
      </View>

      {sections.length ? (
        sections.map((section) => (
          <View key={section.id} style={styles.section}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.grid}>
              {section.modules.map((module, index) => (
                <View key={module.id} style={styles.slot}>
                  <ModuleCard fact={facts[module.id]} module={module} order={index + 1} disabled={!onOpenModule} onPress={() => onOpenModule?.(module)} />
                </View>
              ))}
            </View>
          </View>
        ))
      ) : (
        <EmptyState title="Sin módulos disponibles" message="Tu perfil no tiene operaciones habilitadas en este momento." />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl, maxWidth: 1280, paddingBottom: spacing.xxl },
  header: {
    alignItems: 'center',
    backgroundColor: color.surfaceRaised,
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  brand: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  brandName: { color: color.brand, fontSize: 28, fontWeight: '800', letterSpacing: 1, lineHeight: 34 },
  account: { alignItems: 'center', flexDirection: 'row', flexShrink: 1, flexWrap: 'wrap', gap: spacing.md },
  identity: { flexShrink: 1 },
  user: { color: color.textPrimary, ...typography.body, fontWeight: '700' },
  role: { color: color.textSecondary, ...typography.bodySmall },
  section: { gap: spacing.md },
  sectionTitle: { color: color.textPrimary, fontSize: 24, fontWeight: '700', lineHeight: 30 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  slot: { flexBasis: 260, flexGrow: 1, maxWidth: 400 },
});
