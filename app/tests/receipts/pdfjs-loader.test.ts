import {loadWebPdf} from '@/services/receipts/pdfjs.web';
import {getDocument,GlobalWorkerOptions,type PDFDocumentLoadingTask} from 'pdfjs-dist';
import * as pdfjs from 'pdfjs-dist';
jest.mock('pdfjs-dist',()=>({version:'6.4.299',getDocument:jest.fn(),GlobalWorkerOptions:{workerSrc:''}}));
const mockDestroy=jest.fn(async()=>undefined);
const windowDescriptor=Object.getOwnPropertyDescriptor(globalThis,'window');
const createDescriptor=Object.getOwnPropertyDescriptor(URL,'createObjectURL');
const revokeDescriptor=Object.getOwnPropertyDescriptor(URL,'revokeObjectURL');
const mockCreate=jest.fn(()=> 'blob:local-worker');const mockRevoke=jest.fn();
const load=(uri:string)=>loadWebPdf(uri,async()=>pdfjs);
beforeAll(()=>{
  Object.defineProperty(globalThis,'window',{configurable:true,value:{location:{origin:'http://localhost:8087'}}});
  Object.defineProperty(URL,'createObjectURL',{configurable:true,value:mockCreate});
  Object.defineProperty(URL,'revokeObjectURL',{configurable:true,value:mockRevoke});
});
afterAll(()=>{
  for(const [target,key,descriptor] of [[globalThis,'window',windowDescriptor],[URL,'createObjectURL',createDescriptor],[URL,'revokeObjectURL',revokeDescriptor]] as const){
    if(descriptor)Object.defineProperty(target,key,descriptor);else Reflect.deleteProperty(target,key);
  }
});
beforeEach(()=>{
  jest.clearAllMocks();
  jest.mocked(getDocument).mockReturnValue({promise:Promise.resolve({}),destroy:mockDestroy} as unknown as PDFDocumentLoadingTask);
  jest.spyOn(globalThis,'fetch').mockResolvedValue(new Response('local worker code',{status:200,headers:{'content-type':'text/javascript'}}));
});
afterEach(()=>jest.restoreAllMocks());
it('fetches only the local versioned worker without credentials and releases its blob after destruction',async()=>{
  const task=await load('blob:downloaded-document');
  expect(fetch).toHaveBeenCalledWith('http://localhost:8087/pdfjs/6.4.299/pdf.worker.min.mjs?v=6.4.299',expect.objectContaining({credentials:'omit',cache:'reload',signal:expect.any(AbortSignal)}));
  expect(GlobalWorkerOptions.workerSrc).toBe('blob:local-worker');
  expect(getDocument).toHaveBeenCalledWith(expect.objectContaining({url:'blob:downloaded-document',standardFontDataUrl:'http://localhost:8087/pdfjs/6.4.299/standard_fonts/'}));
  expect(mockRevoke).not.toHaveBeenCalled();
  await task.destroy();await task.destroy();expect(mockRevoke).toHaveBeenCalledTimes(1);expect(mockRevoke).toHaveBeenCalledWith('blob:local-worker');
});
it('rejects remote document URLs before making any request',async()=>{
  await expect(load('https://example.com/private.pdf')).rejects.toThrow('locally downloaded');
  expect(fetch).not.toHaveBeenCalled();expect(getDocument).not.toHaveBeenCalled();
});
it('rejects an incorrectly served worker without executing it',async()=>{
  jest.mocked(fetch).mockResolvedValueOnce(new Response('not JavaScript',{status:200,headers:{'content-type':'text/plain'}}));
  await expect(load('blob:document')).rejects.toThrow('invalid MIME');
  expect(mockCreate).not.toHaveBeenCalled();expect(getDocument).not.toHaveBeenCalled();
});
it('releases the worker URL if document task creation fails',async()=>{
  jest.mocked(getDocument).mockImplementationOnce(()=>{throw new Error('worker initialization failed');});
  await expect(load('blob:document')).rejects.toThrow('initialization failed');
  expect(mockRevoke).toHaveBeenCalledWith('blob:local-worker');
});
it('releases the worker URL even if document destruction rejects',async()=>{
  const task=await load('blob:document');mockDestroy.mockRejectedValueOnce(new Error('destroy failed'));
  await expect(task.destroy()).rejects.toThrow('destroy failed');
  expect(mockRevoke).toHaveBeenCalledTimes(1);await task.destroy();expect(mockRevoke).toHaveBeenCalledTimes(1);
});
