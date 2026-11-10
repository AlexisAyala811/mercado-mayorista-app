import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/ui/components';
import { spacing } from '@/ui/tokens';
import type { CatalogKind } from '@/services/api/catalog-api';

const names: Record<CatalogKind, string> = { providers: 'proveedores', buyers: 'compradores', varieties: 'variedades', qualities: 'calidades', origins: 'procedencias' };

// 'compact' (spec 011, CL-ST18): small edit links under the Stitch forms,
// which have no place for full buttons.
export function OperationReferenceActions({ kinds, onManage, disabled, compact = false }: { kinds: readonly CatalogKind[]; onManage?: (kind: CatalogKind) => void; disabled?: boolean; compact?: boolean }) {
  if (!onManage) return null;
  if (compact) return (
    <View style={styles.links}>
      {kinds.map((kind) => (
        <Pressable accessibilityLabel={`Registrar o editar ${names[kind]}`} accessibilityRole="button" disabled={disabled} key={kind} onPress={() => onManage(kind)} style={({ pressed }) => [styles.link, (pressed || disabled) && styles.dimmed]}>
          <SymbolView fallback={null} name={{ android: 'edit', ios: 'pencil', web: 'edit' }} size={16} tintColor="#047857" />
          <Text style={styles.linkText}>Editar {names[kind]}</Text>
        </Pressable>
      ))}
    </View>
  );
  return <View style={styles.actions}>{kinds.map((kind) => <AppButton key={kind} disabled={disabled} label={`Registrar o editar ${names[kind]}`} tone="secondary" onPress={() => onManage(kind)} />)}</View>;
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  link: { alignItems: 'center', flexDirection: 'row', gap: 4, minHeight: 44 },
  linkText: { color: '#047857', fontSize: 13, fontWeight: '600' },
  dimmed: { opacity: 0.5 },
});
