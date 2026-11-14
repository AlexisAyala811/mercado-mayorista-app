import type { ReactNode } from 'react';
import { SymbolView } from '@/ui/components/symbol';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import type { AccountKindCopy } from '@/domain/accounts/account-kind';
import type { AccountTotals } from '@/domain/accounts/account-totals';
import { accountCounterpartyName } from '@/domain/accounts/account-filters';
import { accountDueLabel, accountMovementLabel } from '@/domain/accounts/account-dates';
import { formatMoney } from '@/domain/reception/reception';
import type { Account } from '@/services/api/operations-api';
import { AppButton, AppScreen, EmptyState, FormField, MetricTile } from '@/ui/components';
import { CountChips } from '@/ui/components/count-chips';
import { AppHeader } from '@/ui/navigation/app-header';
import { color, spacing } from '@/ui/tokens';

type Props = {
  copy: AccountKindCopy;
  accounts: Account[]; total: number; ready: boolean;
  search: string; onSearch: (value: string) => void;
  onOpen: (account: Account) => void;
  // Spec 011 (RQ-ST06): totals on top, state chips and the payment from the card.
  totals: AccountTotals | null;
  stateFilter: 'all' | 'open' | 'paid' | 'voided'; onStateFilter: (state: 'all' | 'open' | 'paid' | 'voided') => void;
  counts: Record<'all' | 'open' | 'paid' | 'voided', number>;
  onSettle: (account: Account) => void;
  onClearFilters: () => void;
  onRefresh: () => void; onNewSource: () => void;
  // Stitch switch between «Deudas» and «Cobranzas» (two routes, CL-FM18).
  onSwitchKind?: () => void;
  feedback: ReactNode; children: ReactNode;
};

// Grey pill with a coloured dot, as in the Stitch «Deudas» mockup (CL-ST21).
const stateTone = {
  open: { dot: '#DC2626' },
  paid: { dot: '#10B981' },
  voided: { dot: '#94A3B8' },
} as const;

function stateLabel(state: 'open' | 'paid' | 'voided', purchase: boolean) {
  if (state === 'open') return purchase ? 'Falta pagar' : 'Saldo pendiente';
  return state === 'paid' ? 'Al día' : 'Anulada';
}

function chipLabels(purchase: boolean) {
  return [
    ['open', purchase ? 'Pendientes de abono / Falta pagar' : 'Pendientes de cobro', 'danger'],
    ['all', 'Todos', 'neutral'],
    ['paid', purchase ? 'Abonados / Al día' : 'Cobradas / Al día', 'success'],
    ['voided', 'Anulados', 'neutral'],
  ] as const;
}

// MAÑAY Deudas / Cobranzas list (spec 011, T1130, CL-ST18): the layout of the
// Stitch «Deudas» mockup: search and actions on top, state chips with counts
// and the switch between debts and collections, three totals and one card per
// account. Financial commands stay in AccountsContent; this view only lists,
// searches and opens accounts.
export function AccountsOverview(props: Props) {
  const { copy } = props;
  const purchase = copy.originSource === 'purchase';
  const settleLabel = purchase ? 'Abonar' : 'Registrar cobro';
  // With large text the blocks need more room and wrap to their own lines (T1190).
  const grow = Math.min(Math.max(useWindowDimensions().fontScale, 1), 2);
  return <AppScreen contentContainerStyle={styles.screen} testID="accounts-overview">
    <AppHeader eyebrow={purchase ? 'COMPRA' : 'VENTA'} subtitle={purchase ? 'Control y cobranzas de saldos pendientes' : 'Control y recuperación de saldos pendientes - clientes'} title={copy.title} />
    <View style={styles.toolbar}>
      <View style={styles.search}><FormField appearance="search" hideLabel label={copy.searchLabel} leadingIcon="search" value={props.search} onChangeText={props.onSearch} placeholder={purchase ? 'Buscar productor o referencia…' : 'Buscar comprador o referencia…'} autoCorrect={false} /></View>
      <AppButton appearance="stitch-action" label="Actualizar" tone="secondary" onPress={props.onRefresh} />
      {props.ready ? <AppButton appearance="stitch-action" label="Limpiar búsqueda de cuentas" displayLabel="Limpiar filtros" tone="secondary" onPress={props.onClearFilters} /> : null}
      <AppButton appearance="stitch-action" displayLabel={purchase ? '+ NUEVA COMPRA' : '+ NUEVA VENTA'} label={copy.originLabel} onPress={props.onNewSource} stitchTone="success" />
    </View>
    {props.feedback}
    {props.ready ? <View style={styles.filters}>
      <CountChips chips={chipLabels(purchase).map(([id, label, tone]) => ({ count: props.counts[id], id, label, tone }))} onSelect={props.onStateFilter} selected={props.stateFilter} />
      {props.onSwitchKind ? (
        <View accessibilityRole="tablist" style={styles.kinds}>
          {([['purchase', 'Deudas a productores (compras)'], ['sale', 'Cuentas por cobrar (clientes)']] as const).map(([kind, label]) => {
            const selected = copy.originSource === kind;
            return <Pressable accessibilityRole="tab" accessibilityState={{ selected }} key={kind} onPress={() => { if (!selected) props.onSwitchKind?.(); }} style={[styles.kind, selected && styles.kindSelected]}><Text style={[styles.kindText, selected && styles.kindTextSelected]}>{label}</Text></Pressable>;
          })}
        </View>
      ) : null}
    </View> : null}
    {props.ready && props.totals ? <View style={styles.totals}>
      <MetricTile appearance="stitch" label={purchase ? 'Total deuda acumulada' : 'Total por cobrar'} value={formatMoney(props.totals.pendingCents)} />
      <MetricTile appearance="stitch" label={purchase ? 'Total abonado este mes' : 'Cobrado este mes'} tone="success" value={formatMoney(props.totals.monthCents)} />
      <MetricTile appearance="stitch" description="Saldo de cuentas con un vencimiento pasado" label="Saldo vencido" tone="danger" value={formatMoney(props.totals.overdueCents)} />
    </View> : null}
    {props.ready ? <>
      <Text accessibilityLiveRegion="polite" style={styles.count}>{props.accounts.length} de {props.total} cuentas</Text>
      {!props.accounts.length ? <EmptyState title={props.total ? 'Sin resultados' : `Sin ${copy.title.toLowerCase()}`} message={props.total ? 'No hay cuentas que coincidan con la búsqueda y los filtros.' : copy.empty} /> : null}
      <View style={styles.list}>
        {props.accounts.map((account) => {
          const name = accountCounterpartyName(account);
          const tone = stateTone[account.state];
          const paid = BigInt(account.initialAmountCents) - BigInt(account.balanceCents);
          return <View key={account.id} style={styles.row}>
            <View style={[styles.party, { flexBasis: 240 * grow }]}>
              <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.avatar}>
                <SymbolView fallback={null} name={{ android: purchase ? 'person' : 'domain', ios: 'person.fill', web: 'person' }} size={24} tintColor="#475569" />
              </View>
              <View style={styles.partyCopy}>
                <Text numberOfLines={2} style={styles.name}>{name}</Text>
                <Text ellipsizeMode="middle" numberOfLines={1} style={styles.reference}>{`#${account.id.slice(0, 8).toUpperCase()} • ${accountDueLabel(account.nextDueOn)}`}</Text>
                <View accessibilityLabel={`Estado: ${stateLabel(account.state, purchase)}`} style={styles.badge}><View style={[styles.badgeDot, { backgroundColor: tone.dot }]} /><Text style={styles.badgeText}>{stateLabel(account.state, purchase)}</Text></View>
              </View>
            </View>
            <View style={[styles.facts, { flexBasis: 300 * grow }]}>
              <Fact label="Origen" value={purchase ? 'Compra liquidada' : 'Venta a crédito'} />
              <Fact label="Último movimiento" value={accountMovementLabel(account.lastMovementAt)} />
              <Fact label={purchase ? 'Total / abonado' : 'Total / adelanto'} value={`${formatMoney(account.initialAmountCents)}`} detail={paid === 0n ? (purchase ? '(Sin abono previo)' : '(Sin adelanto)') : `(${purchase ? 'Ab.' : 'Adel.'} ${formatMoney(paid.toString())})`} detailTone={paid === 0n ? 'danger' : 'success'} />
            </View>
            <View style={styles.balance}>
              <Text style={styles.balanceLabel}>{account.state === 'open' ? 'SALDO PENDIENTE' : 'SALDO'}</Text>
              <Text accessibilityLabel={`Saldo: ${formatMoney(account.balanceCents)}`} style={styles.amount}>{formatMoney(account.balanceCents)}</Text>
            </View>
            <View style={styles.actions}>
              {account.state === 'open' ? <AppButton appearance="stitch-action" label={settleLabel} displayLabel={purchase ? 'ABONAR / LIQUIDAR' : 'Registrar cobro'} accessibilityLabel={`${settleLabel}: ${name}, referencia ${account.id}`} onPress={() => props.onSettle(account)} stitchTone="success" /> : null}
              <AppButton appearance="stitch-action" label="Ver detalle" displayLabel="DETALLE" accessibilityLabel={`Ver detalle de ${name}, referencia ${account.id}`} tone="secondary" onPress={() => props.onOpen(account)} />
            </View>
          </View>;
        })}
      </View>
    </> : null}
    {props.children}
  </AppScreen>;
}

function Fact({ detail, detailTone = 'success', label, value }: { detail?: string; detailTone?: 'success' | 'danger'; label: string; value: string }) {
  return <View style={styles.fact}>
    <Text style={styles.factLabel}>{label.toUpperCase()}</Text>
    <Text numberOfLines={2} style={styles.factValue}>{value}</Text>
    {detail ? <Text style={[styles.factDetail, detailTone === 'danger' && styles.factDetailDanger]}>{detail}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  screen: { gap: spacing.md, maxWidth: 1280 },
  toolbar: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  search: { flexBasis: 320, flexGrow: 1 },
  filters: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  kinds: { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0', borderRadius: 12, borderWidth: 1, flexDirection: 'row', padding: 4 },
  kind: { borderRadius: 8, justifyContent: 'center', minHeight: 40, paddingHorizontal: 12 },
  kindSelected: { backgroundColor: color.surfaceRaised, boxShadow: '0px 1px 2px rgba(15,23,42,0.08)' },
  kindText: { color: '#475569', fontSize: 12, fontWeight: '600' },
  kindTextSelected: { color: '#0F172A' },
  totals: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actions: { flexDirection: 'row', flexShrink: 0, flexWrap: 'wrap', gap: 8 },
  count: { color: '#64748B', fontSize: 13, fontWeight: '500' },
  list: { gap: 12 },
  row: { alignItems: 'center', backgroundColor: color.surfaceRaised, borderColor: '#E2E8F0', borderRadius: 16, borderWidth: 1, boxShadow: '0px 1px 2px rgba(15,23,42,0.05)', flexDirection: 'row', flexWrap: 'wrap', gap: 16, padding: 16 },
  party: { alignItems: 'center', flexBasis: 240, flexDirection: 'row', flexGrow: 1, flexShrink: 1, gap: 12, minWidth: 0 },
  avatar: { alignItems: 'center', backgroundColor: '#F1F5F9', borderColor: '#E2E8F0', borderRadius: 12, borderWidth: 1, height: 48, justifyContent: 'center', width: 48 },
  partyCopy: { flexShrink: 1, gap: 4, minWidth: 0 },
  name: { color: '#0F172A', fontSize: 16, fontWeight: '700', lineHeight: 22 },
  reference: { color: '#64748B', fontSize: 12, fontWeight: '500' },
  badge: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#F1F5F9', borderColor: '#CBD5E1', borderRadius: 6, borderWidth: 1, flexDirection: 'row', gap: 6, paddingHorizontal: 8, paddingVertical: 2 },
  badgeDot: { borderRadius: 3, height: 6, width: 6 },
  badgeText: { color: '#334155', fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  facts: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', borderRadius: 12, borderWidth: 1, flexBasis: 300, flexDirection: 'row', flexGrow: 2, flexShrink: 1, flexWrap: 'wrap', gap: 12, padding: 12 },
  fact: { flexBasis: 90, flexGrow: 1, flexShrink: 1, gap: 2, minWidth: 0 },
  factLabel: { color: '#64748B', fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
  factValue: { color: '#0F172A', fontSize: 13, fontWeight: '700' },
  factDetail: { color: '#047857', fontSize: 11, fontWeight: '600' },
  factDetailDanger: { color: '#B91C1C' },
  balance: { alignItems: 'flex-end', backgroundColor: color.surfaceRaised, borderColor: '#E2E8F0', borderRadius: 12, borderWidth: 1, flexBasis: 150, gap: 2, padding: 10 },
  balanceLabel: { color: '#64748B', fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
  amount: { color: '#0F172A', fontFamily: 'monospace', fontSize: 18, fontWeight: '800' },
});
