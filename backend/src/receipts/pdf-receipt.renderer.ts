import PDFDocument from 'pdfkit';

export interface ReceiptLine {
  description: string;
  detail: string;
  amount?: string;
}

export interface ReceiptDocument {
  businessName: string;
  counterpartyLabel: string;
  counterpartyName: string;
  date: string;
  identifier: string;
  lines: ReceiptLine[];
  operationId: string;
  title: string;
  totals: Array<{ label: string; value: string }>;
}

export function renderReceiptPdf(receipt: ReceiptDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({
      info: {
        Author: receipt.businessName,
        Subject: 'Comprobante interno de operación comercial',
        Title: receipt.title,
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
      .text(receipt.businessName, { align: 'center' });
    document
      .moveDown(0.35)
      .fontSize(15)
      .text(receipt.title, { align: 'center' });
    document
      .moveDown(0.4)
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('#9A3412')
      .text('DOCUMENTO INTERNO — NO ES COMPROBANTE TRIBUTARIO', {
        align: 'center',
      });
    document.fillColor('#111827').moveDown(1.25).font('Helvetica').fontSize(10);
    labelValue(document, 'Código', receipt.identifier);
    labelValue(document, 'Fecha', receipt.date);
    labelValue(document, 'Operación del cliente', receipt.operationId);
    labelValue(document, receipt.counterpartyLabel, receipt.counterpartyName);

    document.moveDown(0.8).font('Helvetica-Bold').fontSize(11).text('Detalle');
    document.moveDown(0.35);
    for (const line of receipt.lines) {
      const width = document.page.width - document.page.margins.left - document.page.margins.right;
      document.font('Helvetica-Bold').fontSize(10);
      const headingHeight = document.heightOfString(line.description, { width });
      document.font('Helvetica').fontSize(9);
      const blockHeight = headingHeight + document.heightOfString(line.detail, { width }) + 8;
      const bottom = document.page.height - document.page.margins.bottom;
      if (document.y + blockHeight > bottom && document.y > document.page.margins.top) {
        document.addPage();
      }
      document
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(line.description, { continued: Boolean(line.amount) });
      if (line.amount) document.text(line.amount, { align: 'right' });
      document
        .font('Helvetica')
        .fillColor('#4B5563')
        .fontSize(9)
        .text(line.detail);
      document.fillColor('#111827').moveDown(0.45);
    }

    document.moveDown(0.4);
    for (const total of receipt.totals) {
      document
        .font('Helvetica')
        .fontSize(10)
        .text(total.label, { continued: true });
      document.font('Helvetica-Bold').text(total.value, { align: 'right' });
    }
    document
      .moveDown(2)
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#6B7280')
      .text(
        'Generado por Mercado. Conserve este documento como constancia operativa interna.',
        { align: 'center' },
      );
    document.end();
  });
}

function labelValue(
  document: PDFKit.PDFDocument,
  label: string,
  value: string,
) {
  document.font('Helvetica-Bold').text(`${label}: `, { continued: true });
  document.font('Helvetica').text(value);
}

export function formatMoney(cents: string) {
  const value = BigInt(cents);
  const sign = value < 0n ? '-' : '';
  const absolute = value < 0n ? -value : value;
  return `${sign}S/ ${absolute / 100n}.${(absolute % 100n).toString().padStart(2, '0')}`;
}
