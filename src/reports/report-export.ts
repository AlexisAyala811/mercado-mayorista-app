import { formatMoney } from '../receipts/pdf-receipt.renderer.js';
import type { ReportExportData, ReportKind, OperationReportRow } from './report-export-data.js';
import { renderReportPdf } from './report-pdf.js';
import { renderReportWorkbook } from './report-workbook.js';

export async function renderReportExport(data: ReportExportData, businessName: string, kind: ReportKind) {
  const { overview: o } = data;
  const operation = o.operation === 'purchase' ? 'compras' : 'ventas';
  const labels: Record<ReportKind, string> = { summary: 'Resumen', detail: 'Detalle', counterparty: 'Por contraparte', variety: 'Por variedad' };
  const title = `${labels[kind]} de ${operation}`;
  const notes = [
    `Negocio: ${businessName}`,
    'Moneda: PEN (soles). Operaciones confirmadas; anuladas excluidas. Cantidades originales, no inventario.',
    'Saldo actual de cuentas de operaciones del periodo, no saldo histórico al cierre.',
    'Nombres de contraparte y variedad vigentes al generar. Descuentos y fletes comunes no se distribuyen por variedad.',
    `Devoluciones confirmadas en el periodo: ${o.returnCount}; importe: ${formatMoney(o.returnAmountCents)}. Separadas de los totales; pueden corresponder a ventas de otros periodos.`,
  ];
  const summary = [
    `Operaciones: ${o.operationCount}`, `Total confirmado: ${formatMoney(o.totalAmountCents)}`,
    `Sacos: ${o.sacks}`, `Peso: ${o.weightKg} kg`,
    `Saldo pendiente actual: ${formatMoney(o.currentBalanceCents)}`, `Cuentas abiertas: ${o.openAccountCount}`,
  ];
  const excel = kind === 'detail' || kind === 'variety';
  let buffer: Buffer;
  if (excel) {
    const columns = kind === 'detail'
      ? ['Referencia operación', 'Fecha Lima', 'ID contraparte', 'Contraparte', 'Bruto (centavos)', 'Flete (centavos)', 'Descuentos (centavos)', 'Adelantos compra (centavos)', 'Total confirmado (centavos)', 'Saldo actual (centavos)', 'Sacos', 'Peso (kg)']
      : ['ID variedad', 'Variedad', 'Operaciones con variedad', 'Sacos', 'Peso (kg)', 'Subtotal asignado (centavos)'];
    const rows = kind === 'detail'
      ? data.rows.map((r) => [r.id, r.date, r.counterpartyId, r.counterparty, r.gross, r.freight, r.discounts, r.advances, r.amount, r.balance, r.sacks, r.weight])
      : data.varieties.map((r) => [r.id, r.name, r.operations, r.sacks, r.weight, r.subtotal ?? 'No distribuido']);
    buffer = await renderReportWorkbook({ title, ...o.period, generatedAt: o.generatedAt, notes: [...notes, ...summary,
      'El flete de venta informado no implica que esté incluido en el total. El total confirmado es el valor registrado.',
      'Subtotales por variedad de venta son brutos de líneas; no incluyen descuentos/fletes de la operación. Compras: no existe importe persistido por saco, se informa No distribuido.',
    ], columns: columns.map((label) => ({ label })), rows });
  } else {
    const sections = [{ title: 'Resumen del periodo', lines: summary }];
    if (kind === 'counterparty') sections.push(...counterpartySections(data.rows));
    if (kind === 'counterparty' && !data.rows.length) sections.push({ title: 'Sin operaciones', lines: ['No hay operaciones confirmadas en el periodo.'] });
    buffer = await renderReportPdf({ businessName, title, metadata: [
      `Periodo Lima: ${o.period.from} a ${o.period.to} (inclusive)`, `Generado (UTC): ${o.generatedAt.toISOString()}`, ...notes,
    ], sections });
  }
  return { buffer, filename: `reporte-${operation}-${kind}-${o.period.from}-${o.period.to}.${excel ? 'xlsx' : 'pdf'}`,
    contentType: excel ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf' };
}

export function counterpartySections(rows: readonly OperationReportRow[]) {
  const groups = new Map<string, { name: string; amount: bigint; balance: bigint; count: bigint; references: string[] }>();
  for (const row of rows) {
    const group = groups.get(row.counterpartyId) ?? { name: row.counterparty, amount: 0n, balance: 0n, count: 0n, references: [] };
    group.amount += BigInt(row.amount); group.balance += BigInt(row.balance); group.count++;
    group.references.push(row.id); groups.set(row.counterpartyId, group);
  }
  return [...groups].map(([id, g]) => ({ title: g.name, lines: [
    `Contraparte: ${id}`, `Operaciones: ${g.count}; total: ${formatMoney(g.amount.toString())}; saldo actual: ${formatMoney(g.balance.toString())}`,
    ...g.references.map((reference) => `Referencia: ${reference}`),
  ] }));
}
