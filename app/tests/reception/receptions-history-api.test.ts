import {listReceptions} from '@/services/api/reception-api';
import {apiRequest} from '@/services/api/api-client';
jest.mock('@/services/api/api-client',()=>({apiRequest:jest.fn()}));
it('encodes the provider literally and sends the applied page and reception filters',async()=>{
  await listReceptions('token',{limit:20,offset:100,from:'2026-10-07',to:'2026-10-07',search:'QA & 50%_',state:'voided'});
  const [path,options]=jest.mocked(apiRequest).mock.calls[0];
  const query=new URLSearchParams(path.split('?')[1]);
  expect(query.get('search')).toBe('QA & 50%_');
  expect(query.get('offset')).toBe('100');expect(query.get('limit')).toBe('20');
  expect(query.get('from')).toBe('2026-10-07');expect(query.get('to')).toBe('2026-10-07');
  expect(query.get('state')).toBe('voided');expect(options).toEqual({token:'token'});
  expect(query.has('stock')).toBe(false);
});
