import { comparePublicationOutcome } from './publication-outcome.js';
const forecast={weekStart:'2026-10-05',weekEnd:'2026-10-11',priceSolesPerKg:'3.0000',lowerSolesPerKg:'2.0000',upperSolesPerKg:'4.0000'};
it('does not report a real price or error during the target week',()=>{
  expect(comparePublicationOutcome(forecast,'2026-10-11',{priceSolesPerKg:'2.0000',weightKg:'10.000',operationCount:1})).toEqual({state:'week_in_progress',actualSolesPerKg:null,absoluteErrorSolesPerKg:null,covered:null});
});
it('distinguishes no observed price from an actual zero price',()=>{
  expect(comparePublicationOutcome(forecast,'2026-10-12',null).state).toBe('no_valid_operations');
  expect(comparePublicationOutcome(forecast,'2026-10-12',{priceSolesPerKg:'0.0000',weightKg:'10.000',operationCount:1})).toMatchObject({state:'compared',actualSolesPerKg:'0.0000',absoluteErrorSolesPerKg:'3.0000',covered:false});
});
it('uses inclusive coverage and permits a small observed sample without inventing five sales',()=>{
  expect(comparePublicationOutcome(forecast,'2026-10-12',{priceSolesPerKg:'2.0000',weightKg:'10.000',operationCount:1})).toMatchObject({absoluteErrorSolesPerKg:'1.0000',covered:true,operationCount:1});
  expect(comparePublicationOutcome(forecast,'2026-10-12',{priceSolesPerKg:'4.0000',weightKg:'10.000',operationCount:1}).covered).toBe(true);
});
it('calculates exact large errors without modifying the original forecast',()=>{
  const original=Object.freeze({...forecast,priceSolesPerKg:'9007199254740993.0000',lowerSolesPerKg:'0.0000',upperSolesPerKg:'9007199254740994.0000'});
  expect(comparePublicationOutcome(original,'2026-10-12',{priceSolesPerKg:'1.0000',weightKg:'10.000',operationCount:1}).absoluteErrorSolesPerKg).toBe('9007199254740992.0000');
});
it('rejects invalid dates, range, price and weight instead of imputing',()=>{
  expect(()=>comparePublicationOutcome(forecast,'2026-02-30',null)).toThrow('Fecha');
  expect(()=>comparePublicationOutcome({...forecast,upperSolesPerKg:'1.0000'},'2026-10-12',null)).toThrow('rango');
  expect(()=>comparePublicationOutcome(forecast,'2026-10-12',{priceSolesPerKg:'NaN',weightKg:'10.000',operationCount:1})).toThrow('Precio');
  expect(()=>comparePublicationOutcome(forecast,'2026-10-12',{priceSolesPerKg:'1.0000',weightKg:'0.000',operationCount:1})).toThrow('peso');
});
