import { useCallback, useEffect, useRef, useState } from 'react';

import { formatMoney } from '@/domain/reception/reception';
import { formatLimaDateInput } from '@/domain/shared/date';
import type { ModuleId } from '@/features/auth/authorization/permissions';
import { purchaseHistorySummary, salesHistorySummary } from '@/services/api/history-api';

// Spec 011 (RQ-ST01, CL-ST08): the live line of each menu card. Only data the
// server gives (or the local queue); a value that could not be read is left
// out, never shown stale.
export type MenuFactsSource = {
  purchasesToday?: number;
  purchasesTodayCents?: string;
  salesToday?: number;
  salesTodayCents?: string;
  payableCents?: string;
  payableCount?: number;
  receivableCents?: string;
  receivableCount?: number;
  pendingOperations: number;
};

export type MenuFacts = Partial<Record<ModuleId, string>>;

export function menuFacts(source: MenuFactsSource): MenuFacts {
  const facts: MenuFacts = {
    'sync-queue': source.pendingOperations > 0 ? `${source.pendingOperations} en cola` : 'Sin pendientes',
  };
  if (source.purchasesTodayCents !== undefined) facts['purchase-history'] = `Hoy ${formatMoney(source.purchasesTodayCents)}`;
  if (source.salesTodayCents !== undefined) facts['sales-history'] = `Hoy ${formatMoney(source.salesTodayCents)}`;
  if (source.payableCents !== undefined) facts.debts = `Por pagar ${formatMoney(source.payableCents)}`;
  if (source.receivableCents !== undefined) facts.collections = `Por cobrar ${formatMoney(source.receivableCents)}`;
  return facts;
}

// Spec 011 (RQ-ST11): the pill of each card, as in Stitch ("12 hoy",
// "3 pendientes"), only from data the server gave.
export function menuBadges(source: MenuFactsSource): MenuFacts {
  const badges: MenuFacts = {};
  if (source.purchasesToday !== undefined) badges['purchase-history'] = `${source.purchasesToday} hoy`;
  if (source.salesToday !== undefined) badges['sales-history'] = `${source.salesToday} hoy`;
  if (source.payableCount !== undefined) badges.debts = pendingLabel(source.payableCount);
  if (source.receivableCount !== undefined) badges.collections = pendingLabel(source.receivableCount);
  return badges;
}

const pendingLabel = (count: number) => (count === 1 ? '1 pendiente' : `${count} pendientes`);

type Remote = Omit<MenuFactsSource, 'pendingOperations'>;

// Reads the facts of the modules the profile shows; each request may fail on
// its own (no connection, no permission) and only hides its own line.
export function useMenuFacts(token: string | null, modules: readonly ModuleId[], pendingOperations: number) {
  const [remote, setRemote] = useState<Remote>({});
  const request = useRef(0);
  const wanted = modules.join(',');
  const load = useCallback(() => {
    if (!token) return;
    const current = ++request.current;
    const shown = new Set(wanted.split(','));
    const today = formatLimaDateInput();
    const settle = <T,>(promise: Promise<T> | null) => (promise ? promise.then((value) => value, () => null) : Promise.resolve(null));
    void Promise.all([
      settle(shown.has('purchase-history') ? purchaseHistorySummary(token, { from: today, to: today }) : null),
      settle(shown.has('debts') ? purchaseHistorySummary(token) : null),
      settle(shown.has('sales-history') ? salesHistorySummary(token, { from: today, to: today }) : null),
      settle(shown.has('collections') ? salesHistorySummary(token) : null),
    ]).then(([purchasesToday, payable, salesToday, receivable]) => {
      if (current !== request.current) return;
      setRemote({
        payableCents: payable?.balanceCents,
        payableCount: payable?.counts.debt,
        purchasesToday: purchasesToday ? purchasesToday.counts.all - purchasesToday.counts.voided : undefined,
        purchasesTodayCents: purchasesToday?.totalCents,
        receivableCents: receivable?.balanceCents,
        receivableCount: receivable?.counts.debt,
        salesToday: salesToday ? salesToday.counts.all - salesToday.counts.voided : undefined,
        salesTodayCents: salesToday?.totalCents,
      });
    });
  }, [token, wanted]);
  useEffect(() => {
    load();
    return () => {
      request.current += 1;
    };
  }, [load]);
  const source = { ...remote, pendingOperations };
  return { badges: menuBadges(source), facts: menuFacts(source), reload: load };
}
