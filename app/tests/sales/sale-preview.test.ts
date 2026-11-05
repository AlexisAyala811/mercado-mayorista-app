import {calculateSalePreview} from '@/domain/sales/sale-preview';
import type {SaleLineDraft} from '@/domain/sales/sale';
const line:SaleLineDraft={id:'line',varietyId:'variety',sacks:'2',weightKg:'20.125',unitPrice:'1.50',priceBasis:'kilogram'};
const agreement={freightBasis:'sack' as const,freightRate:'0.50',freightIncluded:false,discounts:'1'};
it('matches central line rounding and keeps separately charged freight outside total',()=>{
  expect(calculateSalePreview([line],agreement)).toEqual({kind:'ready',grossCents:'3019',freightCents:'100',discountsCents:'100',totalCents:'2919'});
});
it('includes freight only when explicitly agreed and sums rounded lines',()=>{
  const second={...line,id:'other',varietyId:'other',sacks:'1',weightKg:'0.005',unitPrice:'1.00'};
  expect(calculateSalePreview([line,second],{...agreement,freightIncluded:true})).toMatchObject({grossCents:'3020',freightCents:'150',totalCents:'3070'});
});
it('rejects excessive deductions and invalid amounts rather than showing misleading totals',()=>{
  expect(calculateSalePreview([line],{...agreement,discounts:'50'}).kind).toBe('invalid');
  expect(calculateSalePreview([line],{...agreement,freightRate:'0.001'}).kind).toBe('invalid');
});
