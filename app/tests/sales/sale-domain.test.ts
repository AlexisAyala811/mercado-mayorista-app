import { validateSaleLine, type SaleLineDraft } from '@/domain/sales/sale';
const variety={id:'variety',name:'Canchán'};
const line:SaleLineDraft={id:'line',varietyId:'variety',priceBasis:'kilogram',sacks:'30',unitPrice:'1.50',weightKg:'1500'};
describe('sale operation quantities without inventory',()=>{
  it('accepts any valid operation quantity from an active catalogue variety',()=>{expect(validateSaleLine(line,variety)).toBeNull();});
  it('requires a matching catalogue variety',()=>{expect(validateSaleLine(line)).toBe('Selecciona una variedad del catálogo.');expect(validateSaleLine(line,{id:'other',name:'Otra'})).not.toBeNull();});
  it.each(['0','-1','1.5','2147483648'])('rejects invalid sack count %s',sacks=>{expect(validateSaleLine({...line,sacks},variety)).not.toBeNull();});
  it.each(['0','0.000','-1','1.0001','100000000000',''])('rejects invalid weight %s',weightKg=>{expect(validateSaleLine({...line,weightKg},variety)).not.toBeNull();});
  it('accepts three decimals with a comma',()=>{expect(validateSaleLine({...line,weightKg:'0,001'},variety)).toBeNull();});
  it.each(['0','-1','1.001','90000000000.01'])('rejects invalid price %s',unitPrice=>{expect(validateSaleLine({...line,unitPrice},variety)).not.toBeNull();});
});
