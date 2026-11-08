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
  salesToday?: number;
  payableCents?: string;
  receivableCents?: string;
  pendingOperations: number;
};

export type MenuFacts = Partial<Record<ModuleId, string>>;

export function menuFacts(source: MenuFactsSource): MenuFacts {
  const facts: MenuFacts = {
    'sync-queue': source.pendingOperations > 0 ? `${source.pendingOperations} en cola` : 'Sin pendientes',
  };
  if (source.purchasesToday !== undefined) facts['purchase-history'] = `${source.purchasesToday} hoy`;
  if (source.salesToday !== undefined) facts['sales-history'] = `${source.salesToday} hoy`;
  if (source.payableCents !== undefined) facts.debts = `Por pagar ${formatMoney(source.payableCents)}`;
  if (source.receivableCents !== undefined) facts.collections = `Por cobrar ${formatMoney(source.receivableCents)}`;
  return facts;
}

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
        purchasesToday: purchasesToday ? purchasesToday.counts.all - purchasesToday.counts.voided : undefined,
        receivableCents: receivable?.balanceCents,
        salesToday: salesToday ? salesToday.counts.all - salesToday.counts.voided : undefined,
      });
    });
  }, [token, wanted]);
  useEffect(() => {
    load();
    return () => {
      request.current += 1;
    };
  }, [load]);
  return { facts: menuFacts({ ...remote, pendingOperations }), reload: load };
}
