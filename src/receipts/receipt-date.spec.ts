import {receiptCommercialDate,receiptCivilDateVersion} from './receipt-date.js';
it.each([
  ['2026-10-08T04:59:59Z','2026-10-07'],
  ['2026-10-08T05:00:00Z','2026-10-08'],
  ['2027-01-01T02:00:00Z','2026-12-31'],
])('uses the Lima civil date for receipt instant %s', (instant,date)=>{
  expect(receiptCommercialDate(new Date(instant))).toBe(date);
});
it('separates the corrected projection from the preserved UTC document version',()=>{
  expect(receiptCivilDateVersion('confirmed',2)).toBe('confirmed:v2:date-lima-v1');
  expect(receiptCivilDateVersion('voided',3)).not.toBe('confirmed:v2:date-lima-v1');
  expect(receiptCivilDateVersion('confirmed',2)).not.toBe('confirmed:v2');
});
