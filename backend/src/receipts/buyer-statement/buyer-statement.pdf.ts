import PDFDocument from 'pdfkit';

import type { StatementRow, StatementView } from './buyer-statement.view.js';

export function renderBuyerStatementPdf(view: StatementView): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({
      info: {
        Author: view.businessName,
        Subject: 'Estado de cuenta interno del comprador',
        Title: view.title,
      },
      margin: 48,
      size: 'A4',
    });
    const chunks: Buffer[] = [];
    document.on('data', (chunk: Buffer) => chunks.push(chunk));
    document.on('end', () => resolve(Buffer.concat(chunks)));
    document.on('error', reject);

    document
      .font('Helvetica-Bold')
      .fontSize(18)
      .text(view.businessName, { align: 'center' });
    document.moveDown(0.35).fontSize(15).text(view.title, { align: 'center' });
    document.fillColor('#111827').moveDown(1).fontSize(10);
    for (const row of view.header) labelValue(document, row);

    document.moveDown(0.8).font('Helvetica-Bold').fontSize(11).text('Resumen');
    document.moveDown(0.3);
    for (const row of view.summary) amountRow(document, row);

    if (view.emptyMessage) {
      document
        .moveDown(0.8)
        .font('Helvetica-Bold')
        .fontSize(11)
        .text(view.emptyMessage);
    }

    for (const sale of view.sales) {
      const lines = 2 + sale.rows.length + sale.installments.length;
      if (
        document.y + lines * 15 >
        document.page.height - document.page.margins.bottom
      )
        document.addPage();
      document
        .moveDown(0.8)
        .font('Helvetica-Bold')
        .fontSize(11)
        .text(sale.heading);
      document.moveDown(0.2);
      for (const row of sale.rows) amountRow(document, row);
      for (const item of sale.installments) {
        document.fillColor(item.overdue ? '#B91C1C' : '#4B5563');
        amountRow(document, { label: `    ${item.label}`, value: item.value });
      }
      document.fillColor('#111827');
    }

    document
      .moveDown(2)
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#6B7280')
      .text(view.notice, { align: 'center' });
    document.end();
  });
}

function labelValue(document: PDFKit.PDFDocument, row: StatementRow) {
  document.font('Helvetica-Bold').text(`${row.label}: `, { continued: true });
  document.font('Helvetica').text(row.value);
}

function amountRow(document: PDFKit.PDFDocument, row: StatementRow) {
  document
    .font(row.strong ? 'Helvetica-Bold' : 'Helvetica')
    .fontSize(10)
    .text(row.label, { continued: true });
  document.text(row.value, { align: 'right' });
}
