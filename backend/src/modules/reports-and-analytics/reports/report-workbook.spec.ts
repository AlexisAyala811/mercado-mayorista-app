import ExcelJS from 'exceljs';
import { renderReportWorkbook, type ReportWorkbook } from './report-workbook.js';

const report: ReportWorkbook = {
  title: 'Detalle de ventas', from: '2026-10-01', to: '2026-10-19',
  generatedAt: new Date('2026-10-19T15:00:00Z'),
  notes: ['Operaciones confirmadas. No representa inventario.'],
  columns: [{ label: 'Comprador' }, { label: 'Importe (centavos)' }],
  rows: [['=HYPERLINK("https://example.com")', '9007199254740993'], ['+SUM(1,2)', '-1250']],
};

describe('aggregate report workbook', () => {
  it('round trips exact amounts and formula-like names as text in a real XLSX', async () => {
    const bytes = await renderReportWorkbook(report);
    expect(bytes.subarray(0, 2).toString()).toBe('PK');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const data = workbook.getWorksheet('Datos')!;
    expect(data.getCell('A2').value).toBe(report.rows[0][0]);
    expect(data.getCell('A2').type).toBe(ExcelJS.ValueType.String);
    expect(data.getCell('B2').value).toBe('9007199254740993');
    expect(data.getCell('A3').value).toBe('+SUM(1,2)');
    expect(data.getCell('B3').value).toBe('-1250');
    expect(data.rowCount).toBe(3);
    expect(workbook.getWorksheet('Información')!.getCell('B4').value).toBe(report.generatedAt.toISOString());
  });
  it('exports a valid empty report with headers and metadata', async () => {
    const workbook = new ExcelJS.Workbook();
    const bytes = await renderReportWorkbook({ ...report, rows: [] });
    await workbook.xlsx.load(bytes as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    expect(workbook.getWorksheet('Datos')!.rowCount).toBe(1);
  });
  it('rejects inconsistent rows rather than silently losing values', async () => {
    await expect(renderReportWorkbook({ ...report, rows: [['missing amount']] })).rejects.toThrow('columnas');
  });
  it('rejects oversized cells rather than truncating the export', async () => {
    await expect(renderReportWorkbook({ ...report, rows: [['x'.repeat(32768), '0']] })).rejects.toThrow('límite');
  });
});
