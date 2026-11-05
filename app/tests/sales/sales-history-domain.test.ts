import {emptySalesHistoryFilters,formatSaleDate,salesHistoryQuery,validateSalesHistoryFilters} from '@/domain/sales/sales-history';
it('accepts open bounds and trims participant/date filters',()=>{
  const filters={...emptySalesHistoryFilters(),from:' 2026-10-07 ',search:' QA %_ '};
  expect(validateSalesHistoryFilters(filters)).toBeNull();expect(salesHistoryQuery(filters)).toEqual({from:'2026-10-07',to:undefined,search:'QA %_',state:undefined});
});
it.each(['2026-02-30','0000-01-01','2026-10-07T12:00:00Z'])('rejects invalid civil date %s',from=>{expect(validateSalesHistoryFilters({...emptySalesHistoryFilters(),from})).not.toBeNull();});
it('rejects a reversed date range before making a request',()=>{expect(validateSalesHistoryFilters({...emptySalesHistoryFilters(),from:'2026-10-08',to:'2026-10-07'})).not.toBeNull();});
it('shows the Lima commercial date on both sides of UTC midnight',()=>{
  expect(formatSaleDate('2026-10-08T04:59:59Z')).toBe('07/10/2026');expect(formatSaleDate('2026-10-08T05:00:00Z')).toBe('08/10/2026');
});
