import ExcelJS from 'exceljs';
import { UnprocessableEntityException } from '@nestjs/common';

export interface ReportWorkbook {
  title: string;
  from: string;
  to: string;
  generatedAt: Date;
  notes: readonly string[];
  columns: readonly { label: string; width?: number }[];
  rows: readonly (readonly string[])[];
}

// Values are explicitly text: identifiers, exact decimal money and user-supplied
// names must never become rounded floating point numbers or Excel formulas.
export async function renderReportWorkbook(report: ReportWorkbook): Promise<Buffer> {
  if (!report.columns.length || report.columns.length > 16384 || report.rows.length > 1048575) {
    throw new UnprocessableEntityException('El reporte excede los límites de Excel. Selecciona un periodo menor.');
  }
  const metadata = [
    ['Reporte', report.title],
    ['Desde (America/Lima)', report.from],
    ['Hasta (America/Lima, inclusive)', report.to],
    ['Generado (UTC)', report.generatedAt.toISOString()],
    ['Formato de valores', 'Texto para preservar identificadores y decimales exactos. Importes en soles salvo columna indicada en centavos.'],
    ...report.notes.map((note) => ['Nota', note]),
  ];
  for (const row of [...metadata, report.columns.map((column) => column.label)]) {
    validateCells(row);
  }
  for (const row of report.rows) {
    if (row.length !== report.columns.length) throw new Error('El detalle no coincide con las columnas del reporte.');
    validateCells(row);
  }
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Mercado';
  workbook.created = report.generatedAt;
  workbook.modified = report.generatedAt;
  const description = workbook.addWorksheet('Información');
  description.columns = [{ width: 34 }, { width: 100 }];
  metadata.forEach((row) => description.addRow(row));
  description.eachRow((row) => {
    row.alignment = { vertical: 'top', wrapText: true };
    row.height = Math.max(30, 16 * Math.ceil(String(row.getCell(2).value ?? '').length / 90));
  });
  const detail = workbook.addWorksheet('Datos', { views: [{ state: 'frozen', ySplit: 1 }] });
  detail.columns = report.columns.map((column) => ({ width: column.width ?? 24, style: { numFmt: '@' } }));
  detail.addRow(report.columns.map((column) => column.label));
  for (const row of report.rows) detail.addRow([...row]);
  detail.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: report.columns.length } };
  for (const sheet of [description, detail]) {
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF595959' } };
    sheet.getRow(1).alignment = { wrapText: true, vertical: 'middle' };
    sheet.getRow(1).height = 32;
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function validateCells(cells: readonly string[]) {
  if (cells.some((value) => value.length > 32767)) {
    throw new UnprocessableEntityException('Un texto del reporte excede el límite de Excel; no se ha recortado el contenido.');
  }
}
