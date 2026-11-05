import {fetch} from 'expo/fetch';
import * as Sharing from 'expo-sharing';
import {shareReceipt} from '@/services/receipts/receipt-sharing';
jest.mock('expo/fetch',()=>({fetch:jest.fn()}));
jest.mock('expo-file-system',()=>({Paths:{cache:'cache'},File:jest.fn().mockImplementation(()=>({uri:'file://test-receipt.pdf',create:jest.fn(),write:jest.fn()}))}));
jest.mock('expo-sharing',()=>({isAvailableAsync:jest.fn(),shareAsync:jest.fn()}));
jest.mock('@/services/api/api-client',()=>({getApiBaseUrl:()=> 'http://test/api',ApiError:class extends Error{},ApiUnavailableError:class extends Error{}}));
type FetchResult=Awaited<ReturnType<typeof fetch>>;
const response={ok:true,bytes:async()=>new Uint8Array([37,80,68,70])} as unknown as FetchResult;
beforeEach(()=>{jest.clearAllMocks();jest.mocked(Sharing.isAvailableAsync).mockResolvedValue(true);});
it('never opens sharing when a download completes after its session ended',async()=>{
  let active=true;let resolve!:(response:FetchResult)=>void;
  jest.mocked(fetch).mockReturnValueOnce(new Promise(done=>{resolve=done;}));
  const pending=shareReceipt('sales','id','token',()=>active);active=false;resolve(response);
  expect(await pending).toBeNull();expect(Sharing.isAvailableAsync).not.toHaveBeenCalled();expect(Sharing.shareAsync).not.toHaveBeenCalled();
});
it('rechecks session ownership after asynchronous sharing availability',async()=>{
  let active=true;let available!:(value:boolean)=>void;let reached!:()=>void;
  const arrival=new Promise<void>(done=>{reached=done;});
  jest.mocked(fetch).mockResolvedValue(response);
  jest.mocked(Sharing.isAvailableAsync).mockImplementationOnce(()=>{reached();return new Promise(done=>{available=done;});});
  const pending=shareReceipt('sales','id','token',()=>active);await arrival;active=false;available(true);
  expect(await pending).toBeNull();expect(Sharing.shareAsync).not.toHaveBeenCalled();
});
