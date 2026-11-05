import {apiRequest,ApiUnavailableError} from '@/services/api/api-client';
import {loadCatalogPages} from '@/services/api/catalog-pages';
jest.mock('@/services/api/api-client',()=>({...jest.requireActual('@/services/api/api-client'),apiRequest:jest.fn()}));
it('loads beyond the first hundred and keeps literal identifiers once',async()=>{
  jest.mocked(apiRequest).mockResolvedValueOnce({items:Array.from({length:100},(_,i)=>({id:`item-${i}`})),total:101});
  jest.mocked(apiRequest).mockResolvedValueOnce({items:[{id:'item-100'}],total:101});
  const result=await loadCatalogPages('/catalog/providers','token');
  expect(result).toHaveLength(101);expect(result[100].id).toBe('item-100');
  expect(apiRequest).toHaveBeenLastCalledWith('/catalog/providers?limit=100&offset=100',{token:'token'});
});
it('rejects partial results instead of announcing a complete central catalog',async()=>{
  jest.mocked(apiRequest).mockResolvedValueOnce({items:[{id:'one'}],total:2});
  jest.mocked(apiRequest).mockRejectedValueOnce(new ApiUnavailableError());
  await expect(loadCatalogPages('/catalog/varieties','token')).rejects.toBeInstanceOf(ApiUnavailableError);
});
it('rejects a missing page rather than looping forever',async()=>{
  jest.mocked(apiRequest).mockResolvedValueOnce({items:[],total:2});
  await expect(loadCatalogPages('/catalog/varieties','token')).rejects.toThrow('incompleto');
});
