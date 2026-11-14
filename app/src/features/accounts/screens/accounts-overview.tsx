import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { AccountKindCopy } from '@/domain/accounts/account-kind';
import { accountCounterpartyName } from '@/domain/accounts/account-filters';
import { accountDueLabel, accountMovementLabel } from '@/domain/accounts/account-dates';
import { formatMoney } from '@/domain/reception/reception';
import type { Account } from '@/services/api/operations-api';
import { AppButton, AppScreen, EmptyState, FormField } from '@/ui/components';
import { AppHeader } from '@/ui/navigation/app-header';
import { color, radius, spacing, typography } from '@/ui/tokens';

type Props = {
  copy: AccountKindCopy;
  accounts: Account[]; total: number; ready: boolean;
  search: string; onSearch: (value: string) => void;
  onOpen: (account: Account) => void;
  onRefresh: () => void; onNewSource: () => void;
  feedback: ReactNode; children: ReactNode;
};

const stateTone = {
  open: { label: 'Pendiente', box: { backgroundColor: color.dangerMuted, borderColor: color.dangerAccent }, text: { color: color.danger } },
  paid: { label: 'Pagada', box: { backgroundColor: color.successMuted, borderColor: color.successAccent }, text: { color: color.success } },
  voided: { label: 'Anulada', box: { backgroundColor: color.surface, borderColor: color.border }, text: { color: color.textSecondary } },
} as const;

// MAÑAY Deudas / Cobranzas list (spec 011, T1130). Financial commands stay in
// AccountsContent; this view only lists, searches and opens accounts.
export function AccountsOverview(props: Props) {
  const { copy } = props;
  return <AppScreen contentContainerStyle={styles.screen} testID="accounts-overview">
    <AppHeader eyebrow={copy.eyebrow} title={copy.title} />
    <View style={styles.toolbar}>
      <View style={styles.search}><FormField label={copy.searchLabel} value={props.search} onChangeText={props.onSearch} placeholder="Buscar…" autoCorrect={false} /></View>
      <AppButton label="Actualizar" tone="secondary" onPress={props.onRefresh} />
      <AppButton label={copy.originLabel} tone="secondary" onPress={props.onNewSource} />
    </View>
    {props.feedback}
    {props.ready ? <>
      <Text accessibilityLiveRegion="polite" style={styles.count}>{props.accounts.length} de {props.total} cuentas</Text>
      {!props.accounts.length ? <EmptyState title={props.total ? 'Sin resultados' : `Sin ${copy.title.toLowerCase()}`} message={props.total ? 'No hay cuentas que coincidan con la búsqueda y los filtros.' : copy.empty} /> : null}
      <View style={styles.list}>
        {props.accounts.map((account) => {
          const name = accountCounterpartyName(account);
          const tone = stateTone[account.state];
          return <View key={account.id} style={styles.row}>
            <View style={styles.party}>
              <Text numberOfLines={1} style={styles.name}>{name}</Text>
              <Text style={styles.meta}>{accountDueLabel(account.nextDueOn)} · {accountMovementLabel(account.lastMovementAt)}</Text>
              <Text ellipsizeMode="middle" numberOfLines={1} style={styles.reference}>Referencia {account.id}</Text>
            </View>
            <View style={styles.balance}>
              <View accessibilityLabel={`Estado: ${tone.label}`} style={[styles.badge, tone.box]}><Text style={[styles.badgeText, tone.text]}>{tone.label}</Text></View>
              <Text accessibilityLabel={`Saldo: ${formatMoney(account.balanceCents)}`} style={styles.amount}>{formatMoney(account.balanceCents)}</Text>
            </View>
            <AppButton label="Ver detalle" accessibilityLabel={`Ver detalle de ${name}, referencia ${account.id}`} tone="secondary" onPress={() => props.onOpen(account)} />
          </View>;
        })}
      </View>
    </> : null}
    {props.children}
  </AppScreen>;
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg, maxWidth: 1280 },
  toolbar: { alignItems: 'flex-end', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  search: { flexBasis: 320, flexGrow: 1 },
  count: { color: color.textSecondary, ...typography.bodySmall },
  list: { gap: spacing.sm },
  row: { alignItems: 'center', backgroundColor: color.surfaceRaised, borderColor: color.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, padding: spacing.md },
  party: { flexBasis: 240, flexGrow: 2, flexShrink: 1, gap: spacing.xs, minWidth: 0 },
  name: { color: color.textPrimary, fontSize: 20, fontWeight: '700', lineHeight: 26 },
  meta: { color: color.textSecondary, ...typography.bodySmall },
  reference: { color: color.textSecondary, fontSize: 13, lineHeight: 18 },
  balance: { alignItems: 'flex-end', flexBasis: 180, flexGrow: 1, gap: spacing.xs },
  badge: { borderLeftWidth: 4, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  badgeText: { ...typography.bodySmall, fontWeight: '800' },
  amount: { color: color.textPrimary, fontSize: 24, fontWeight: '800', lineHeight: 30 },
});
