import { formatMoney } from '../pdf-receipt.renderer.js';
import type { BuyerStatement } from './buyer-statement.js';

// Text content of the statement, shared by the PDF and the image so both
// documents always say the same thing.

export type StatementRow = { label: string; value: string; strong?: boolean };

export type StatementSaleView = {
  heading: string;
  rows: StatementRow[];
  installments: Array<{ label: string; value: string; overdue: boolean }>;
};

export type StatementView = {
  businessName: string;
  title: string;
  header: StatementRow[];
  summary: StatementRow[];
  sales: StatementSaleView[];
  emptyMessage: string | null;
  notice: string;
};

export const STATEMENT_NOTICE =
  'Documento interno informativo. No es comprobante de pago ni factura electrónica.';

export function buildStatementView(statement: BuyerStatement): StatementView {
  const { totals } = statement;
  return {
    businessName: statement.businessName,
    title: 'Estado de cuenta',
    header: [
      { label: 'Comprador', value: statement.buyer.name, strong: true },
      { label: 'Fecha de corte', value: formatCutoff(statement.cutoffAt) },
      { label: 'Documento', value: statement.statementNumber },
    ],
    summary: [
      {
        label: 'Total adeudado',
        value: formatMoney(totals.outstandingCents),
        strong: true,
      },
      { label: 'Monto vencido', value: formatMoney(totals.overdueCents) },
      {
        label: 'Próximo vencimiento',
        value: totals.nextDue
          ? `${formatDate(totals.nextDue.dueOn)} · ${formatMoney(totals.nextDue.amountCents)}`
          : '—',
      },
    ],
    sales: statement.sales.map((sale) => ({
      heading: `Venta ${sale.saleCode} · ${formatDate(sale.saleDate)}`,
      rows: [
        { label: 'Importe', value: formatMoney(sale.initialCents) },
        { label: 'Abonos', value: formatMoney(sale.paidCents) },
        { label: 'Devoluciones', value: formatMoney(sale.returnedCents) },
        {
          label: 'Saldo',
          value: formatMoney(sale.outstandingCents),
          strong: true,
        },
      ],
      installments: sale.installments.map((item) => ({
        label: `Vence ${formatDate(item.dueOn)}${item.overdue ? ' · VENCIDA' : ''}`,
        value: formatMoney(item.outstandingCents),
        overdue: item.overdue,
      })),
    })),
    emptyMessage: statement.sales.length ? null : 'Sin saldo pendiente.',
    notice: STATEMENT_NOTICE,
  };
}

/** 2026-10-30 → 30/10/2026 */
export function formatDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

function formatCutoff(instant: string) {
  const parts = new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(instant));
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value;
  return `${part('day')}/${part('month')}/${part('year')} ${part('hour')}:${part('minute')}`;
}
