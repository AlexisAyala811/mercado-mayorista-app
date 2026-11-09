import { priceChange, type AnalyticsPoint } from './analytics';

// Spec 011 (RQ-ST08, CL-ST06): the price board Stitch opens Analítica with.
// One card per variety: the agreed price of its latest week with data, for
// purchases and for sales, and the bars of the last 8 weeks. Agreed prices
// only; a suggested price comes from a reviewed publication (CL-FM20).
export type BoardPrice = { price: string; weekStart: string; complete: boolean; change: string | null };
export type BoardCard = {
  varietyId: string;
  varietyName: string;
  purchase: BoardPrice | null;
  sale: BoardPrice | null;
  // Bars of the sale price per week, or the purchase price when there are no sales.
  barsOf: 'sale' | 'purchase';
  weeks: { weekStart: string; price: string }[];
};

// First day of the 8-week window ending at `today` (civil dates, aaaa-mm-dd).
export function boardWindowStart(today: string) {
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 7 * 8 + 1);
  return date.toISOString().slice(0, 10);
}

function latest(points: AnalyticsPoint[]): BoardPrice | null {
  const sorted = [...points].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  const last = sorted.at(-1);
  if (!last) return null;
  const before = sorted.at(-2);
  const consecutive = before && Date.parse(`${last.weekStart}T00:00:00Z`) - Date.parse(`${before.weekStart}T00:00:00Z`) === 7 * 86400000;
  return {
    change: before && consecutive && before.complete ? priceChange(last.priceSolesPerKg, before.priceSolesPerKg) : null,
    complete: last.complete,
    price: last.priceSolesPerKg,
    weekStart: last.weekStart,
  };
}

export function priceBoard(points: readonly AnalyticsPoint[]): BoardCard[] {
  const byVariety = new Map<string, AnalyticsPoint[]>();
  for (const point of points) byVariety.set(point.varietyId, [...(byVariety.get(point.varietyId) ?? []), point]);
  const cards: BoardCard[] = [];
  for (const [varietyId, list] of byVariety) {
    const purchases = list.filter((point) => point.operationType === 'purchase');
    const sales = list.filter((point) => point.operationType === 'sale');
    const barsOf = sales.length ? 'sale' : 'purchase';
    cards.push({
      barsOf,
      purchase: latest(purchases),
      sale: latest(sales),
      varietyId,
      varietyName: list[0]!.varietyName,
      weeks: (barsOf === 'sale' ? sales : purchases)
        .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
        .map((point) => ({ price: point.priceSolesPerKg, weekStart: point.weekStart })),
    });
  }
  return cards.sort((a, b) => a.varietyName.localeCompare(b.varietyName, 'es'));
}

// A price in soles per kilogram as the board shows it: rounded half up to the
// cent with integers («1.9550» → «1.96»); the exact value stays in the data.
export function boardPrice(price: string) {
  const negative = price.startsWith('-');
  const [whole, fraction = ''] = price.replace('-', '').split('.');
  const tenThousandths = BigInt(whole || '0') * 10000n + BigInt((fraction + '0000').slice(0, 4));
  const cents = (tenThousandths + 50n) / 100n;
  return `${negative ? '-' : ''}${cents / 100n}.${(cents % 100n).toString().padStart(2, '0')}`;
}
