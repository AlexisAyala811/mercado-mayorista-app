import {listSales} from '@/services/api/sales-api';
import {apiRequest} from '@/services/api/api-client';
jest.mock('@/services/api/api-client',()=>({apiRequest:jest.fn()}));
it('encodes participant text and page filters into a central history request',async()=>{
  await listSales('token',{limit:20,offset:100,from:'2026-10-07',search:'QA & 50%_',state:'voided'});
  const path=jest.mocked(apiRequest).mock.calls[0][0];const query=new URLSearchParams(path.split('?')[1]);
  expect(query.get('search')).toBe('QA & 50%_');expect(query.get('offset')).toBe('100');expect(query.get('state')).toBe('voided');expect(query.has('stock')).toBe(false);
});
