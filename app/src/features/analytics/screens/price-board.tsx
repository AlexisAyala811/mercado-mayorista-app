import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AnalyticsPoint } from '@/domain/analytics/analytics';
import { boardPrice, boardWindowStart, priceBoard, type BoardCard, type BoardPrice } from '@/domain/analytics/price-board';
import { largestDifference, latestWeekVolume, priceDifference, priceTrend } from '@/domain/analytics/price-board-summary';
import { formatLimaDateInput } from '@/domain/shared/date';
import { analyticsSeries } from '@/services/api/analytics-api';
import { FeedbackState } from '@/ui/components/feedback-state';
import { LoadingState } from '@/ui/components/loading-state';
import { accent, color } from '@/ui/tokens';

// Spec 011 (RQ-ST08, CL-ST06, CL-ST18, Stitch «Analítica de mercado»): agreed
// prices of the last 8 weeks, read once when Analítica opens: two price
// indicators and the volume, one quote card per variety with its purchase and
// sale price and their difference, the weekly evolution of the chosen variety
// and the variety with the largest difference. Never a suggested price nor a
// margin: those come from a reviewed publication (CL-FM20).
export function PriceBoard({ token }: { token: string }) {
  const [data, setData] = useState<{ cards: BoardCard[]; points: AnalyticsPoint[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const to = formatLimaDateInput();
    analyticsSeries(token, { from: boardWindowStart(to), to }).then(
      (series) => { if (active) setData({ cards: priceBoard(series.points), points: series.points }); },
      (cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'No se pudo leer la pizarra de precios.'); },
    );
    return () => {
      active = false;
    };
  }, [attempt, token]);
  const cards = data?.cards ?? null;
  const volume = data ? latestWeekVolume(data.points) : null;
  const featured = cards && volume ? [...cards].sort((a, b) => volume.order.indexOf(a.varietyId) - volume.order.indexOf(b.varietyId)).slice(0, 2) : [];
  const selected = cards?.find((card) => card.varietyId === selectedId) ?? cards?.[0] ?? null;
  const best = cards ? largestDifference(cards) : null;
  return (
    <View style={styles.board} testID="price-board">
      <Text accessibilityRole="header" style={styles.title}>Pizarra de precios</Text>
      <Text style={styles.note}>Precio pactado por kilo de las últimas 8 semanas, por variedad. El precio sugerido solo aparece cuando hay datos suficientes y una publicación revisada (en «Estimaciones»).</Text>
      {error ? <FeedbackState title="Pizarra no disponible" message={error} tone="error" actionLabel="Reintentar" onAction={() => { setError(null); setData(null); setAttempt((value) => value + 1); }} /> : null}
      {!error && !cards ? <LoadingState label="Leyendo precios de las últimas semanas" /> : null}
      {cards && !cards.length ? <Text style={styles.note}>Sin compras ni ventas confirmadas en las últimas 8 semanas.</Text> : null}

      {cards?.length && volume ? (
        <View style={styles.kpis}>
          {featured.map((card) => {
            const price = card.sale ?? card.purchase;
            const trend = priceTrend(price?.change ?? null);
            return (
              <View key={card.varietyId} style={[styles.kpi, styles.kpiGreen]}>
                <View style={styles.kpiHead}>
                  <Text style={styles.kpiLabel}>{`PRECIO ${card.sale ? 'DE VENTA' : 'DE COMPRA'} ${card.varietyName.toUpperCase()}`}</Text>
                  <View style={[styles.trend, trend.tone === 'up' ? styles.trendUp : trend.tone === 'down' ? styles.trendDown : styles.trendFlat]}><Text style={[styles.trendText, trend.tone === 'down' && styles.trendTextDown]}>{trend.label}</Text></View>
                </View>
                <Text style={styles.kpiValue}>{price ? `S/ ${boardPrice(price.price)}` : '—'}<Text style={styles.kpiUnit}> / kg</Text></Text>
                <View style={styles.kpiFoot}><Text style={styles.kpiFootLabel}>Volumen de la semana:</Text><Text style={styles.kpiFootValue}>{volume.byVariety(card.varietyId)}</Text></View>
              </View>
            );
          })}
          <View style={[styles.kpi, styles.kpiDark]}>
            <View style={styles.kpiHead}>
              <Text style={styles.kpiLabel}>VOLUMEN TOTAL DE LA SEMANA</Text>
              <View style={[styles.trend, styles.trendFlat]}><Text style={styles.trendText}>{volume.weekStart ? `Semana ${volume.weekStart.slice(8, 10)}/${volume.weekStart.slice(5, 7)}` : '—'}</Text></View>
            </View>
            <Text style={styles.kpiValue}>{volume.total.replace(' kg', '')}<Text style={styles.kpiUnit}> kg netos</Text></Text>
            <View style={styles.kpiFoot}><Text style={styles.kpiFootLabel}>Sacos de la semana:</Text><Text style={styles.kpiFootValue}>{volume.sacks} sacos</Text></View>
          </View>
        </View>
      ) : null}

      {cards?.length ? (
        <View style={styles.columns}>
          <View style={styles.left}>
            <View style={styles.sectionHead}>
              <Text accessibilityRole="header" style={styles.section}>COTIZACIONES POR VARIEDAD</Text>
              <Text style={styles.note}>{cards.length} {cards.length === 1 ? 'variedad' : 'variedades'}</Text>
            </View>
            {cards.map((card) => {
              const trend = priceTrend((card.sale ?? card.purchase)?.change ?? null);
              const difference = priceDifference(card);
              const active = selected?.varietyId === card.varietyId;
              return (
                <View key={card.varietyId} style={[styles.quote, active && styles.quoteActive]}>
                  <View style={styles.quoteHead}>
                    <View style={styles.quoteIcon}><SymbolView fallback={null} name={{ android: 'eco', ios: 'leaf', web: 'eco' }} size={20} tintColor={color.brand} /></View>
                    <View style={styles.quoteTitles}>
                      <View style={styles.quoteTitleLine}>
                        <Text style={styles.variety}>{card.varietyName}</Text>
                        <View style={[styles.trend, trend.tone === 'up' ? styles.trendUp : trend.tone === 'down' ? styles.trendDown : styles.trendFlat]}><Text style={[styles.trendText, trend.tone === 'down' && styles.trendTextDown]}>{trend.label}</Text></View>
                      </View>
                      <Text style={styles.quoteMeta}>{weekLine(card.sale ?? card.purchase)}</Text>
                    </View>
                    <Pressable accessibilityLabel={`Ver evolución de ${card.varietyName}`} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => setSelectedId(card.varietyId)} style={styles.history}>
                      <Text style={styles.historyText}>Ver evolución ›</Text>
                    </Pressable>
                  </View>
                  <View style={styles.quotePrices}>
                    <Price label="Compra pactada" value={card.purchase} />
                    <Price label="Venta pactada" value={card.sale} />
                    <View accessible accessibilityLabel={difference ? `Diferencia venta menos compra: ${difference.display} por kilo` : 'Diferencia: falta compra o venta'} style={styles.difference}>
                      <Text style={styles.differenceLabel}>Diferencia venta − compra</Text>
                      <Text style={styles.differenceValue}>{difference ? difference.display : '—'}<Text style={styles.priceUnit}>{difference ? ' /kg' : ''}</Text></Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.right}>
            {selected ? (
              <View style={styles.panel}>
                <Text accessibilityRole="header" style={styles.panelTitle}>{`Evolución de precio (${selected.weeks.length} ${selected.weeks.length === 1 ? 'semana' : 'semanas'})`}</Text>
                <Text style={styles.note}>{`${selected.varietyName} · precio ${selected.barsOf === 'sale' ? 'de venta' : 'de compra'} pactado por semana (S/ por kg)`}</Text>
                <View accessible accessibilityLabel={selected.weeks.map((week) => `${week.weekStart}: S/ ${boardPrice(week.price)}`).join('. ')} style={styles.chart} testID="price-evolution">
                  {(() => {
                    const max = Math.max(0, ...selected.weeks.map((week) => Number(week.price)));
                    return selected.weeks.map((week, index) => (
                      <View key={week.weekStart} style={styles.week}>
                        <Text numberOfLines={1} style={styles.weekValue}>{boardPrice(week.price)}</Text>
                        <View style={styles.weekTrack}><View style={[styles.weekBar, index === selected.weeks.length - 1 && styles.weekBarLast, { height: `${max > 0 ? Math.max(6, Math.round((Number(week.price) / max) * 100)) : 0}%` }]} /></View>
                        <Text style={styles.weekLabel}>{`${week.weekStart.slice(8, 10)}/${week.weekStart.slice(5, 7)}`}</Text>
                      </View>
                    ));
                  })()}
                </View>
              </View>
            ) : null}
            {best ? (
              <View style={styles.opportunity}>
                <View style={styles.opportunityIcon}><SymbolView fallback={null} name={{ android: 'insights', ios: 'chart.line.uptrend.xyaxis', web: 'insights' }} size={22} tintColor={color.textOnBrand} /></View>
                <View style={styles.opportunityCopy}>
                  <Text style={styles.opportunityLabel}>MAYOR DIFERENCIA PACTADA</Text>
                  <Text style={styles.opportunityTitle}>{`${best.card.varietyName} (${best.display} /kg)`}</Text>
                  <Text style={styles.opportunityText}>Diferencia entre el precio pactado de venta y el de compra de la última semana con datos. No descuenta flete ni estiba, y no es un precio sugerido.</Text>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function weekLine(price: BoardPrice | null) {
  return price ? `Semana del ${price.weekStart}${price.complete ? '' : ' (en curso)'}` : 'Sin operaciones';
}

function Price({ label, value }: { label: string; value: BoardPrice | null }) {
  return (
    <View style={styles.price} accessible accessibilityLabel={value ? `${label}: S/ ${boardPrice(value.price)} por kilo, semana del ${value.weekStart}` : `${label}: sin operaciones`}>
      <Text style={styles.priceLabel}>{label}</Text>
      <Text style={styles.priceValue}>{value ? `S/ ${boardPrice(value.price)}` : '—'}<Text style={styles.priceUnit}>{value ? ' /kg' : ''}</Text></Text>
    </View>
  );
}

const styles = StyleSheet.create({
  board: { gap: 14 },
  title: { color: '#0F172A', fontSize: 20, fontWeight: '800' },
  note: { color: '#64748B', fontSize: 12 },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpi: { backgroundColor: color.surfaceRaised, borderBottomWidth: 4, borderColor: '#E2E8F0', borderRadius: 14, borderWidth: 1, boxShadow: '0px 1px 2px rgba(15,23,42,0.05)', flexBasis: 260, flexGrow: 1, gap: 8, padding: 16 },
  kpiGreen: { borderBottomColor: '#047857' },
  kpiDark: { borderBottomColor: '#0B2A1F' },
  kpiHead: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  kpiLabel: { color: '#334155', flexShrink: 1, fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  kpiValue: { color: '#0F172A', fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  kpiUnit: { color: '#475569', fontSize: 13, fontWeight: '500' },
  kpiFoot: { flexDirection: 'row', justifyContent: 'space-between' },
  kpiFootLabel: { color: '#475569', fontSize: 12 },
  kpiFootValue: { color: '#0F172A', fontSize: 12, fontWeight: '700' },
  trend: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  trendUp: { backgroundColor: accent.emerald.pill },
  trendDown: { backgroundColor: '#FEE2E2' },
  trendFlat: { backgroundColor: '#E2E8F0' },
  trendText: { color: accent.emerald.pillInk, fontSize: 10, fontWeight: '700' },
  trendTextDown: { color: '#991B1B' },
  columns: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  left: { flexBasis: 560, flexGrow: 1.5, gap: 12 },
  right: { flexBasis: 320, flexGrow: 1, gap: 12 },
  sectionHead: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  section: { color: '#0F172A', fontSize: 15, fontWeight: '800', letterSpacing: 0.6 },
  quote: { backgroundColor: color.surfaceRaised, borderColor: '#E2E8F0', borderLeftColor: '#CBD5E1', borderLeftWidth: 4, borderRadius: 14, borderWidth: 1, boxShadow: '0px 1px 2px rgba(15,23,42,0.05)', gap: 10, padding: 14 },
  quoteActive: { borderLeftColor: '#047857' },
  quoteHead: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  quoteIcon: { alignItems: 'center', backgroundColor: '#EFF4FF', borderRadius: 10, height: 36, justifyContent: 'center', width: 36 },
  quoteTitles: { flex: 1, gap: 2 },
  quoteTitleLine: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  variety: { color: '#0F172A', fontSize: 16, fontWeight: '700' },
  quoteMeta: { color: '#64748B', fontSize: 12 },
  history: { backgroundColor: '#F1F5F9', borderRadius: 8, justifyContent: 'center', minHeight: 36, paddingHorizontal: 12 },
  historyText: { color: '#0F172A', fontSize: 12, fontWeight: '700' },
  quotePrices: { alignItems: 'stretch', backgroundColor: '#F1F5F9', borderRadius: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 10 },
  price: { flexBasis: 120, flexGrow: 1, gap: 2, justifyContent: 'center', paddingHorizontal: 4 },
  priceLabel: { color: '#475569', fontSize: 11, fontWeight: '600' },
  priceValue: { color: '#0F172A', fontSize: 18, fontWeight: '800' },
  priceUnit: { color: '#64748B', fontSize: 11, fontWeight: '500' },
  difference: { alignItems: 'flex-end', backgroundColor: '#D1FAE5', borderRadius: 8, flexBasis: 170, flexGrow: 1, gap: 2, justifyContent: 'center', padding: 10 },
  differenceLabel: { color: '#065F46', fontSize: 11, fontWeight: '600' },
  differenceValue: { color: '#065F46', fontSize: 18, fontWeight: '800' },
  panel: { backgroundColor: color.surfaceRaised, borderColor: '#E2E8F0', borderRadius: 14, borderWidth: 1, gap: 8, padding: 16 },
  panelTitle: { color: '#0F172A', fontSize: 15, fontWeight: '700' },
  chart: { alignItems: 'flex-end', borderBottomColor: '#E2E8F0', borderBottomWidth: 1, flexDirection: 'row', gap: 8, height: 170, paddingBottom: 4 },
  week: { alignItems: 'center', flex: 1, gap: 4, height: '100%', maxWidth: 64 },
  weekValue: { color: '#475569', fontSize: 10, fontWeight: '600' },
  weekTrack: { flex: 1, justifyContent: 'flex-end', width: '60%' },
  weekBar: { backgroundColor: '#A7F3D0', borderTopLeftRadius: 4, borderTopRightRadius: 4, width: '100%' },
  weekBarLast: { backgroundColor: '#047857' },
  weekLabel: { color: '#475569', fontSize: 10, fontWeight: '600' },
  opportunity: { backgroundColor: '#D1FAE5', borderColor: '#A7F3D0', borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 16 },
  opportunityIcon: { alignItems: 'center', backgroundColor: '#065F46', borderRadius: 10, height: 40, justifyContent: 'center', width: 40 },
  opportunityCopy: { flex: 1, gap: 4 },
  opportunityLabel: { color: '#047857', fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  opportunityTitle: { color: '#0F172A', fontSize: 16, fontWeight: '800' },
  opportunityText: { color: '#334155', fontSize: 12, lineHeight: 17 },
});
