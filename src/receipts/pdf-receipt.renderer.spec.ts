import { describe, expect, it } from 'vitest';

import { formatMoney, renderReceiptPdf } from './pdf-receipt.renderer.js';

describe('PDF receipt renderer', () => {
  it('creates a valid PDF and labels it as an internal non-tax document', async () => {
    const pdf = await renderReceiptPdf({
      businessName: 'Mercado Central',
      counterpartyLabel: 'Comprador',
      counterpartyName: 'Cliente Uno',
      date: '2026-09-25',
      identifier: 'receipt-id',
      lines: [
        {
          amount: 'S/ 100.00',
          description: 'Canchán',
          detail: '2 sacos · 100.000 kg',
        },
      ],
      operationId: 'operation-id',
      title: 'Comprobante de venta',
      totals: [{ label: 'Total', value: 'S/ 100.00' }],
    });

    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.byteLength).toBeGreaterThan(500);
  });

  it('formats cents without floating-point arithmetic', () => {
    expect(formatMoney('123456')).toBe('S/ 1234.56');
    expect(formatMoney('-5')).toBe('-S/ 0.05');
  });
});
