import PDFDocument from 'pdfkit';

export interface ReportPdf {
  businessName: string; title: string; metadata: string[];
  sections: { title: string; lines: string[] }[];
}

export function renderReportPdf(report: ReportPdf): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ size: 'A4', margin: 48, bufferPages: true,
      info: { Author: report.businessName, Title: report.title, Subject: 'Reporte comercial interno' } });
    const chunks: Buffer[] = [];
    document.on('data', (chunk: Buffer) => chunks.push(chunk));
    document.on('error', reject);
    document.on('end', () => resolve(Buffer.concat(chunks)));
    document.font('Helvetica-Bold').fontSize(18).text(report.businessName);
    document.moveDown(0.4).fontSize(15).text(report.title);
    document.moveDown(0.5).font('Helvetica').fontSize(9);
    for (const line of report.metadata) document.text(line);
    for (const section of report.sections) {
      if (document.y + 65 > document.page.height - 48) document.addPage();
      document.moveDown(0.8).font('Helvetica-Bold').fontSize(11).text(section.title);
      document.font('Helvetica').fontSize(10);
      for (const line of section.lines) document.text(line, { paragraphGap: 4 });
    }
    const range = document.bufferedPageRange();
    for (let page = range.start; page < range.start + range.count; page++) {
      document.switchToPage(page);
      // Footer sits inside the bottom margin without provoking another page.
      document.font('Helvetica').fontSize(8).text(`Mercado · Documento interno · ${page + 1}/${range.count}`, 48, document.page.height - 35, { lineBreak: false });
    }
    document.end();
  });
}
