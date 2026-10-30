import { buildBuyerStatement, type StatementInput } from './buyer-statement.js';
import {
  buildBuyerStatementSvg,
  renderBuyerStatementPng,
  STATEMENT_IMAGE_WIDTH,
} from './buyer-statement.image.js';
import { renderBuyerStatementPdf } from './buyer-statement.pdf.js';
import {
  buildStatementView,
  STATEMENT_NOTICE,
} from './buyer-statement.view.js';

function input(saleCount = 1): StatementInput {
  return {
    businessName: 'Mercado E2E',
    buyer: { id: 'buyer-1', name: 'Comercial Lima & Hijos' },
    cutoffAt: new Date('2026-10-30T15:42:10Z'),
    accounts: Array.from({ length: saleCount }, (_, index) => ({
      accountId: `account-${index}`,
      saleId: `${String(index).padStart(8, '3')}-0000-4000-8000-000000000001`,
      saleCreatedAt: new Date('2026-10-15T15:00:00Z'),
      state: 'open' as const,
      version: 3,
      initialCents: '80000',
      balanceCents: '40000',
      payments: [{ amountCents: '30000', isReversal: false }],
      returnCreditsCents: ['10000'],
      installments: [
        { dueOn: '2026-10-29', balanceCents: '20000', state: 'open' as const },
        { dueOn: '2026-11-15', balanceCents: '20000', state: 'open' as const },
      ],
    })),
  };
}

const view = (saleCount = 1) =>
  buildStatementView(buildBuyerStatement(input(saleCount)));

describe('buyer statement view', () => {
  it('states the figures of the spec example in soles', () => {
    const result = view();
    expect(result.header).toEqual([
      { label: 'Comprador', value: 'Comercial Lima & Hijos', strong: true },
      { label: 'Fecha de corte', value: '30/10/2026 10:42' },
      { label: 'Documento', value: expect.stringMatching(/^EC-20261030-/) },
    ]);
    expect(result.summary).toEqual([
      { label: 'Total adeudado', value: 'S/ 400.00', strong: true },
      { label: 'Monto vencido', value: 'S/ 200.00' },
      { label: 'Próximo vencimiento', value: '15/11/2026 · S/ 200.00' },
    ]);
    expect(result.sales[0]).toEqual({
      heading: 'Venta V-33333330 · 15/10/2026',
      rows: [
        { label: 'Importe', value: 'S/ 800.00' },
        { label: 'Abonos', value: 'S/ 300.00' },
        { label: 'Devoluciones', value: 'S/ 100.00' },
        { label: 'Saldo', value: 'S/ 400.00', strong: true },
      ],
      installments: [
        {
          label: 'Vence 29/10/2026 · VENCIDA',
          value: 'S/ 200.00',
          overdue: true,
        },
        { label: 'Vence 15/11/2026', value: 'S/ 200.00', overdue: false },
      ],
    });
    expect(result.notice).toBe(STATEMENT_NOTICE);
  });

  it('shows the empty message and never the credit limit', () => {
    const empty = buildStatementView(
      buildBuyerStatement({ ...input(), accounts: [] }),
    );
    expect(empty.emptyMessage).toBe('Sin saldo pendiente.');
    expect(empty.summary[0]!.value).toBe('S/ 0.00');
    expect(empty.summary[2]!.value).toBe('—');
    expect(JSON.stringify(view())).not.toMatch(
      /l[ií]mite|cr[eé]dito disponible/i,
    );
  });
});

describe('buyer statement PDF', () => {
  it('creates a valid PDF titled as a statement', async () => {
    const pdf = await renderBuyerStatementPdf(view(3));
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.byteLength).toBeGreaterThan(1000);
  });
});

describe('buyer statement image', () => {
  it('escapes text and marks overdue installments in the SVG', () => {
    const svg = buildBuyerStatementSvg(view());
    expect(svg).toContain('Comercial Lima &amp; Hijos');
    expect(svg).toContain('VENCIDA');
    expect(svg).toContain(`width="${STATEMENT_IMAGE_WIDTH}"`);
    expect(svg).not.toMatch(/font-size="(1\d|2[0-7])"/);
  });

  it('renders a 1080 px wide PNG that grows with the sales', () => {
    const size = (png: Buffer) => ({
      width: png.readUInt32BE(16),
      height: png.readUInt32BE(20),
    });
    const one = renderBuyerStatementPng(view(1));
    const ten = renderBuyerStatementPng(view(10));
    expect(one.subarray(1, 4).toString()).toBe('PNG');
    expect(size(one).width).toBe(1080);
    expect(size(ten).width).toBe(1080);
    expect(size(ten).height).toBeGreaterThan(size(one).height);
  });
});
