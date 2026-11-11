import { SymbolView } from '@/ui/components/symbol';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { ModuleCard } from '@/features/home/components/module-card';
import type { MenuFacts } from '@/features/home/menu-facts';
import { menuSides, type MenuModule, type MenuSide } from '@/features/home/menu-modules';
import { AppScreen, EmptyState } from '@/ui/components';
import { AppHeader } from '@/ui/navigation/app-header';
import { accent, card, color, radius, spacing } from '@/ui/tokens';

export type HomeScreenProps = {
  badges?: MenuFacts;
  facts?: MenuFacts;
  initialSide?: MenuSide;
  modules: MenuModule[];
  onLogout?: () => void;
  onOpenModule?: (module: MenuModule) => void;
  onSideChange?: (side: MenuSide) => void;
  roleLabel: string;
  userDisplayName: string;
};

// MAÑAY menu (spec 011, RQ-ST11): the Compra / Venta switch of Stitch with up
// to six cards per side, and "Más opciones" for what Stitch does not draw
// (CL-ST15).
export function HomeScreen({ badges = {}, facts = {}, initialSide = 'purchase', modules, onLogout, onOpenModule, onSideChange, roleLabel, userDisplayName }: HomeScreenProps) {
  const { fontScale, height, width } = useWindowDimensions();
  const [side, setSide] = useState<MenuSide>(initialSide);
  const cards = modules.filter((module) => module.section === side);
  const more = modules.filter((module) => module.section === 'more');
  const columns = width >= 900 ? 3 : width >= 600 || fontScale <= 1.3 ? 2 : 1;
  const compact = width < 600;
  const dense = !compact && height < 900 && fontScale <= 1.3;

  return (
    <AppScreen contentContainerStyle={[styles.screen, dense && styles.screenDense]} testID="home-screen">
      <AppHeader
        title={`Menú principal de MAÑAY. Usuario ${userDisplayName}, ${roleLabel}`}
        trailing={onLogout ? (
          <Pressable accessibilityLabel="Cerrar sesión" accessibilityRole="button" onPress={onLogout} style={({ pressed }) => [styles.logout, pressed && styles.logoutPressed]} testID="logout">
            <SymbolView fallback={<Text style={styles.logoutText}>Salir</Text>} name={{ android: 'logout', ios: 'rectangle.portrait.and.arrow.right', web: 'logout' }} size={22} tintColor="#475569" />
          </Pressable>
        ) : null}
        variant="brand"
      />

      {modules.length ? (
        <>
          <View accessibilityRole="tablist" style={styles.switch}>
            {menuSides.map((item) => {
              const selected = item.id === side;
              return (
                <Pressable
                  accessibilityLabel={item.title}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  key={item.id}
                  onPress={() => {
                    setSide(item.id);
                    onSideChange?.(item.id);
                  }}
                  style={[styles.switchOption, selected && styles.switchSelected]}>
                  <SymbolView fallback={null} name={{ android: item.icon, ios: 'bag', web: item.icon }} size={22} tintColor={selected ? color.textOnBrand : '#334155'} />
                  <Text style={[styles.switchText, selected && styles.switchTextSelected]}>{item.title}</Text>
                </Pressable>
              );
            })}
          </View>

          {cards.length ? (
            <View style={styles.grid}>
              {cards.map((module, index) => (
                <View key={`${module.section}:${module.id}`} style={[styles.slot, { flexBasis: `${Math.floor(100 / columns) - 2}%` }]}>
                  <ModuleCard
                    badge={badges[module.id]}
                    compact={compact}
                    dense={dense}
                    disabled={!onOpenModule}
                    fact={facts[module.id]}
                    module={module}
                    onPress={() => onOpenModule?.(module)}
                    order={index + 1}
                  />
                </View>
              ))}
              {/* Fillers keep the last row aligned to the columns. */}
              {Array.from({ length: (columns - (cards.length % columns)) % columns }, (_, index) => (
                <View key={`filler-${index}`} style={[styles.slot, { flexBasis: `${Math.floor(100 / columns) - 2}%` }]} />
              ))}
            </View>
          ) : (
            <EmptyState title="Sin opciones en este lado" message="Tu perfil no tiene operaciones habilitadas aquí." />
          )}

          {more.length ? (
            <View style={styles.more}>
              <Text accessibilityRole="header" style={styles.moreTitle}>Más opciones</Text>
              <View style={styles.moreRow}>
                {more.map((module) => (
                  <Pressable
                    accessibilityHint={[module.description, facts[module.id]].filter(Boolean).join('. ')}
                    accessibilityLabel={module.title}
                    accessibilityRole="button"
                    disabled={!onOpenModule}
                    key={module.id}
                    onPress={() => onOpenModule?.(module)}
                    style={({ pressed }) => [styles.moreChip, pressed && styles.moreChipPressed]}
                    testID={`more-${module.id}`}>
                    <SymbolView fallback={null} name={{ android: module.icon, ios: 'square.grid.2x2', web: module.icon }} size={22} tintColor={accent.slate.ink} />
                    <View style={styles.moreCopy}>
                      <Text style={styles.moreText}>{module.title}</Text>
                      {facts[module.id] ? <Text style={styles.moreFact} testID={`fact-${module.id}`}>{facts[module.id]}</Text> : null}
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
        </>
      ) : (
        <EmptyState title="Sin módulos disponibles" message="Tu perfil no tiene operaciones habilitadas en este momento." />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.md, maxWidth: 1280, paddingBottom: spacing.xl, paddingTop: 0 },
  screenDense: { gap: 12 },
  logout: { alignItems: 'center', borderColor: '#E2E8F0', borderRadius: radius.sm, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
  logoutPressed: { backgroundColor: '#F8FAFC', transform: [{ scale: 0.95 }] },
  logoutText: { color: '#475569', fontSize: 13, fontWeight: '700' },
  switch: {
    alignSelf: 'center',
    backgroundColor: '#E2E8F0',
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: spacing.sm,
    maxWidth: 448,
    padding: 6,
    width: '100%',
  },
  switchOption: { alignItems: 'center', borderRadius: radius.md, flex: 1, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', minHeight: 52, paddingHorizontal: spacing.lg },
  switchSelected: { backgroundColor: color.brand, boxShadow: '0px 4px 6px rgba(15,23,42,0.18)' },
  switchText: { color: '#334155', fontSize: 18, fontWeight: '700' },
  switchTextSelected: { color: color.textOnBrand },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  slot: { flexGrow: 1 },
  more: { gap: spacing.sm, marginTop: spacing.sm },
  moreTitle: { color: color.textSecondary, fontSize: 14, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  moreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  moreChip: {
    alignItems: 'center',
    backgroundColor: color.surfaceRaised,
    borderColor: card.borderColor,
    borderRadius: radius.md,
    borderWidth: card.borderWidth,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  moreChipPressed: { borderColor: color.successAccent },
  moreCopy: { flexShrink: 1 },
  moreText: { color: color.textPrimary, fontSize: 16, fontWeight: '700' },
  moreFact: { color: color.textSecondary, fontSize: 13, fontWeight: '600' },
});
