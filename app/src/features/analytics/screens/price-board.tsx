import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { boardPrice, boardWindowStart, priceBoard, type BoardCard, type BoardPrice } from '@/domain/analytics/price-board';
import { formatLimaDateInput } from '@/domain/shared/date';
import { analyticsSeries } from '@/services/api/analytics-api';
import { BarChart } from '@/ui/components/bar-chart';
import { FeedbackState } from '@/ui/components/feedback-state';
import { LoadingState } from '@/ui/components/loading-state';
import { color, radius, spacing, typography } from '@/ui/tokens';

// Spec 011 (RQ-ST08, CL-ST06, Stitch «Pizarra de precios»): agreed prices of
// the last 8 weeks per variety, read once when Analítica opens.
export function PriceBoard({ token }: { token: string }) {
  const [cards, setCards] = useState<BoardCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    const to = formatLimaDateInput();
    analyticsSeries(token, { from: boardWindowStart(to), to }).then(
      (series) => { if (active) setCards(priceBoard(series.points)); },
      (cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'No se pudo leer la pizarra de precios.'); },
    );
    return () => {
      active = false;
    };
  }, [attempt, token]);
  return (
    <View style={styles.board} testID="price-board">
      <Text accessibilityRole="header" style={styles.title}>Pizarra de precios</Text>
      <Text style={styles.note}>Precio pactado por kilo de las últimas 8 semanas, por variedad. El precio sugerido solo aparece cuando hay datos suficientes y una publicación revisada (abajo, en disponibilidad de estimaciones).</Text>
      {error ? <FeedbackState title="Pizarra no disponible" message={error} tone="error" actionLabel="Reintentar" onAction={() => { setError(null); setCards(null); setAttempt((value) => value + 1); }} /> : null}
      {!error && !cards ? <LoadingState label="Leyendo precios de las últimas semanas" /> : null}
      {cards && !cards.length ? <Text style={styles.note}>Sin compras ni ventas confirmadas en las últimas 8 semanas.</Text> : null}
      <View style={styles.cards}>
        {cards?.map((card) => (
          <View key={card.varietyId} style={styles.card}>
            <Text style={styles.variety}>{card.varietyName}</Text>
            <View style={styles.prices}>
              <Price label="Compra" value={card.purchase} />
              <Price label="Venta" value={card.sale} />
            </View>
            <BarChart
              title={card.barsOf === 'sale' ? 'Venta por semana' : 'Compra por semana'}
              items={card.weeks.map((week) => ({ display: `S/ ${boardPrice(week.price)} / kg`, key: week.weekStart, label: `${week.weekStart.slice(8, 10)}/${week.weekStart.slice(5, 7)}`, value: Number(week.price) }))}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

function Price({ label, value }: { label: string; value: BoardPrice | null }) {
  return (
    <View style={styles.price} accessible accessibilityLabel={value ? `${label}: S/ ${boardPrice(value.price)} por kilo, semana del ${value.weekStart}` : `${label}: sin operaciones`}>
      <Text style={styles.priceLabel}>{label}</Text>
      <Text style={styles.priceValue}>{value ? `S/ ${boardPrice(value.price)}` : '—'}<Text style={styles.unit}>{value ? ' / kg' : ''}</Text></Text>
      <Text style={styles.priceMeta}>{value ? `Semana del ${value.weekStart}${value.complete ? '' : ' (en curso)'}` : 'Sin operaciones'}</Text>
      {value?.change ? <Text style={styles.priceMeta}>{value.change} respecto a la semana anterior</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  board: { gap: spacing.md },
  title: { color: color.textPrimary, fontSize: 22, fontWeight: '800', lineHeight: 28 },
  note: { color: color.textSecondary, ...typography.bodySmall },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  card: { backgroundColor: color.surfaceRaised, borderColor: color.border, borderLeftColor: color.brand, borderLeftWidth: 4, borderRadius: radius.lg, borderWidth: 1, flexBasis: 300, flexGrow: 1, flexShrink: 1, gap: spacing.md, minWidth: 0, padding: spacing.md },
  variety: { color: color.textPrimary, fontSize: 18, fontWeight: '700', lineHeight: 24 },
  prices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  price: { backgroundColor: color.surface, borderRadius: radius.md, flexBasis: 130, flexGrow: 1, flexShrink: 1, gap: 2, minWidth: 0, padding: spacing.sm },
  priceLabel: { color: color.textSecondary, ...typography.bodySmall, fontWeight: '700' },
  priceValue: { color: color.textPrimary, fontSize: 26, fontWeight: '800', lineHeight: 32 },
  unit: { color: color.textSecondary, fontSize: 14, fontWeight: '600' },
  priceMeta: { color: color.textSecondary, fontSize: 12, lineHeight: 16 },
});
