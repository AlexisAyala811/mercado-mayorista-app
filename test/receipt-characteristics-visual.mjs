// Synthetic read-only projection: no API, database, return submission or financial writes.
import { mkdir, writeFile } from 'node:fs/promises';
import { renderReceiptPdf } from '../dist/receipts/pdf-receipt.renderer.js';
import { receiptCharacteristics, receiptSackGroups } from '../dist/receipts/receipt-characteristics.js';

const destination = new URL('../../tmp/pdfs/characteristics-20261014/', import.meta.url);
await mkdir(destination, { recursive: true });
const longName = 'Selección comercial para mercado regional con clasificación de tamaño y presentación homogénea de origen local';
if (longName.length > 120) throw new Error('Visual fixture exceeds the approved name limit.');
const known = { qualityId: 'quality', qualityName: longName, originId: 'origin', originName: 'Centro poblado de San Pedro de Cajas, provincia de Tarma, departamento de Junín' };
const samples = [
  { varietyId: 'v', netWeightKg: '10.001', ...known },
  { varietyId: 'v', netWeightKg: '20.002', ...known },
  { varietyId: 'v', netWeightKg: '30.003' },
  { varietyId: 'v', netWeightKg: '40.004', ...known, qualityName: 'Segunda comercial' },
];
const purchaseLines = receiptSackGroups(samples).map(group => ({
  description: 'Canchán',
  detail: `${group.sacks} saco(s) · ${(Number(group.weight) / 1000).toFixed(3)} kg netos\n${receiptCharacteristics(group.source)}`,
}));
const saleLines = Array.from({ length: 24 }, (_, index) => ({
  amount: 'S/ 25.00',
  description: `Canchán - línea ${index + 1}`,
  detail: `1 saco(s) · 10.000 kg · S/ 2.50 por kg\n${receiptCharacteristics(index % 3 === 0 ? {} : known)}`,
}));
const documents = [
  { kind: 'purchase', title: 'Comprobante de compra', lines: purchaseLines, total: 'S/ 250.00' },
  { kind: 'sale', title: 'Comprobante de venta', lines: saleLines, total: 'S/ 600.00' },
  { kind: 'return', title: 'Comprobante interno de devolución comercial', lines: [{
    description: 'Canchán', amount: 'S/ 12.50',
    detail: `0 saco(s) · 5.000 kg · bruto S/ 12.50 · descuento S/ 0.00\n${receiptCharacteristics(known)}`,
  }], total: 'S/ 12.50' },
];
for (const { kind, title, lines, total } of documents) {
  await writeFile(new URL(`${kind}.pdf`, destination), await renderReceiptPdf({
    businessName: 'Mercado QA - muestra sintética', counterpartyLabel: kind === 'purchase' ? 'Proveedor' : 'Comprador',
    counterpartyName: 'Persona ficticia para revisión visual', date: '2026-10-14',
    identifier: '00000000-0000-4000-8000-000000000001', operationId: '00000000-0000-4000-8000-000000000002',
    title, lines, totals: [{ label: 'Total', value: total }],
  }));
}
console.log(JSON.stringify({ syntheticOnly: true, files: documents.map(({kind}) => `${kind}.pdf`), directory: destination.pathname }));
