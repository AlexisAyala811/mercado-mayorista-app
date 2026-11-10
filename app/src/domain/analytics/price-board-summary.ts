import type { AnalyticsPoint } from './analytics';
import { boardPrice, type BoardCard } from './price-board';

// Spec 011 (RQ-ST08, CL-ST18, CL-FM20): the figures around the Stitch price
// board, from agreed prices only: never a suggested price or a profit margin.

function tenThousandths(price: string) {
  const negative = price.startsWith('-');
  const [whole, fraction = ''] = price.replace('-', '').split('.');
  const value = BigInt(whole || '0') * 10000n + BigInt((fraction + '0000').slice(0, 4));
  return negative ? -value : value;
}

function grams(weightKg: string) {
  const [whole, fraction = ''] = weightKg.split('.');
  return BigInt(whole || '0') * 1000n + BigInt((fraction + '000').slice(0, 3));
}

const kilograms = (value: bigint) => `${((value + 500n) / 1000n).toLocaleString('es-PE')} kg`;

// Sale price minus purchase price of the latest weeks, per kilogram; null
// when one of the two is missing.
export function priceDifference(card: Pick<BoardCard, 'purchase' | 'sale'>) {
  if (!card.purchase || !card.sale) return null;
  const difference = tenThousandths(card.sale.price) - tenThousandths(card.purchase.price);
  const text = boardPrice(`${difference < 0n ? '-' : ''}${(difference < 0n ? -difference : difference) / 10000n}.${((difference < 0n ? -difference : difference) % 10000n).toString().padStart(4, '0')}`);
  return { value: difference, display: `${difference >= 0n ? '+' : ''}S/ ${text.replace('-', '−')}` };
}

// Trend of the latest week against the previous one, from priceChange.
export function priceTrend(change: string | null) {
  if (!change) return { label: 'SIN COMPARACIÓN', tone: 'neutral' as const };
  if (change.startsWith('+')) return { label: `ALZA (${change.replace(' %', '%')})`, tone: 'up' as const };
  if (change.startsWith('−')) return { label: `BAJA (${change.replace(' %', '%')})`, tone: 'down' as const };
  return { label: 'ESTABLE (0,0%)', tone: 'neutral' as const };
}

// Kilograms of each variety in its latest week with data, both operations.
export function latestWeekVolume(points: readonly AnalyticsPoint[]) {
  const latest = points.reduce((max, point) => (point.weekStart > max ? point.weekStart : max), '');
  const byVariety = new Map<string, bigint>();
  let total = 0n;
  let sacks = 0;
  for (const point of points) {
    if (point.weekStart !== latest) continue;
    const weight = grams(point.weightKg);
    byVariety.set(point.varietyId, (byVariety.get(point.varietyId) ?? 0n) + weight);
    total += weight;
    sacks += point.sacks;
  }
  return { weekStart: latest || null, total: kilograms(total), sacks, byVariety: (id: string) => kilograms(byVariety.get(id) ?? 0n), order: [...byVariety.entries()].sort((a, b) => (b[1] > a[1] ? 1 : b[1] < a[1] ? -1 : 0)).map(([id]) => id) };
}

// The variety with the largest agreed difference between sale and purchase.
export function largestDifference(cards: readonly BoardCard[]) {
  let best: { card: BoardCard; display: string; value: bigint } | null = null;
  for (const card of cards) {
    const difference = priceDifference(card);
    if (difference && (!best || difference.value > best.value)) best = { card, ...difference };
  }
  return best;
}
