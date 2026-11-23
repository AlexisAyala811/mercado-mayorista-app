import { Resvg } from '@resvg/resvg-js';
import { join } from 'node:path';

import type { StatementRow, StatementView } from './buyer-statement.view.js';

// The statement as a PNG for WhatsApp: fixed 1080 px width and text of at
// least 28 px so it reads on a phone without zooming (plan 009).

export const STATEMENT_IMAGE_WIDTH = 1080;
const MARGIN = 56;
const LINE = 46;
const MAX_TEXT = 40;
const FONT = 'Noto Sans';
// The container and the tests run from the backend folder (WORKDIR /app).
const FONT_DIR = join(process.cwd(), 'assets', 'fonts');

export function buildBuyerStatementSvg(view: StatementView) {
  const parts: string[] = [];
  let y = MARGIN;
  const text = (
    x: number,
    value: string,
    size: number,
    options: {
      bold?: boolean;
      anchor?: 'start' | 'middle' | 'end';
      color?: string;
    } = {},
  ) =>
    parts.push(
      `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}"` +
        ` font-weight="${options.bold ? 700 : 400}" fill="${options.color ?? '#111827'}"` +
        ` text-anchor="${options.anchor ?? 'start'}">${escape(value)}</text>`,
    );
  const row = (item: StatementRow, color?: string) => {
    y += LINE;
    text(MARGIN, item.label, 30, { bold: item.strong, color });
    text(STATEMENT_IMAGE_WIDTH - MARGIN, item.value, 30, {
      anchor: 'end',
      bold: item.strong,
      color,
    });
  };
  const rule = () => {
    y += 24;
    parts.push(
      `<rect x="${MARGIN}" y="${y}" width="${STATEMENT_IMAGE_WIDTH - 2 * MARGIN}" height="2" fill="#D1D5DB"/>`,
    );
  };

  y += 44;
  text(STATEMENT_IMAGE_WIDTH / 2, truncate(view.businessName), 40, {
    anchor: 'middle',
    bold: true,
  });
  y += 52;
  text(STATEMENT_IMAGE_WIDTH / 2, view.title, 36, { anchor: 'middle' });
  y += 16;
  for (const item of view.header) row({ ...item, value: truncate(item.value) });
  rule();
  for (const item of view.summary) row(item);
  if (view.emptyMessage) {
    rule();
    y += LINE + 8;
    text(STATEMENT_IMAGE_WIDTH / 2, view.emptyMessage, 32, {
      anchor: 'middle',
      bold: true,
    });
  }
  for (const sale of view.sales) {
    rule();
    y += LINE + 4;
    text(MARGIN, sale.heading, 32, { bold: true });
    for (const item of sale.rows) row(item);
    for (const item of sale.installments)
      row(
        { label: `   ${item.label}`, value: item.value },
        item.overdue ? '#B91C1C' : '#4B5563',
      );
  }
  rule();
  y += LINE + 8;
  text(STATEMENT_IMAGE_WIDTH / 2, view.notice.split('. ')[0] + '.', 28, {
    anchor: 'middle',
    color: '#6B7280',
  });
  y += 40;
  text(
    STATEMENT_IMAGE_WIDTH / 2,
    view.notice.split('. ').slice(1).join('. '),
    28,
    {
      anchor: 'middle',
      color: '#6B7280',
    },
  );
  const height = y + MARGIN;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${STATEMENT_IMAGE_WIDTH}" height="${height}" viewBox="0 0 ${STATEMENT_IMAGE_WIDTH} ${height}">` +
    `<rect width="${STATEMENT_IMAGE_WIDTH}" height="${height}" fill="#FFFFFF"/>` +
    parts.join('') +
    '</svg>'
  );
}

export function renderBuyerStatementPng(view: StatementView): Buffer {
  const resvg = new Resvg(buildBuyerStatementSvg(view), {
    background: '#FFFFFF',
    fitTo: { mode: 'width', value: STATEMENT_IMAGE_WIDTH },
    font: {
      defaultFontFamily: FONT,
      fontFiles: [
        join(FONT_DIR, 'NotoSans-Regular.ttf'),
        join(FONT_DIR, 'NotoSans-Bold.ttf'),
      ],
      loadSystemFonts: false,
    },
  });
  return resvg.render().asPng();
}

function truncate(value: string) {
  return value.length > MAX_TEXT ? `${value.slice(0, MAX_TEXT - 1)}…` : value;
}

function escape(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
