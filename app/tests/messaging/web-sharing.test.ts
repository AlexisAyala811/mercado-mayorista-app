import {Platform} from 'react-native';
import {downloadAttachmentCopy,requestAttachmentShare,type Attachment} from '@/services/messaging/attachment-sharing';
jest.mock('expo-document-picker',()=>({getDocumentAsync:jest.fn()}));
jest.mock('expo-sharing',()=>({isAvailableAsync:jest.fn(),shareAsync:jest.fn()}));
jest.mock('expo-file-system',()=>({File:class{},Paths:{cache:{uri:'file:///cache/'}}}));
const mockClick=jest.fn();const mockCreate=jest.fn();const mockRevoke=jest.fn();const mockShare=jest.fn();
const attachment=():Attachment=>({filename:'public-qa.png',mimeType:'image/png',sizeBytes:100,uri:'blob:chosen',webFile:{name:'public-qa.png'} as File});
let navigatorDescriptor:PropertyDescriptor|undefined;let documentDescriptor:PropertyDescriptor|undefined;
let createDescriptor:PropertyDescriptor|undefined;let revokeDescriptor:PropertyDescriptor|undefined;
beforeEach(()=>{
  jest.clearAllMocks();jest.useFakeTimers();Object.defineProperty(Platform,'OS',{configurable:true,value:'web'});
  navigatorDescriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');documentDescriptor=Object.getOwnPropertyDescriptor(globalThis,'document');
  createDescriptor=Object.getOwnPropertyDescriptor(URL,'createObjectURL');revokeDescriptor=Object.getOwnPropertyDescriptor(URL,'revokeObjectURL');
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{canShare:()=>true,share:mockShare}});
  Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>({click:mockClick})}});
  Object.defineProperty(URL,'createObjectURL',{configurable:true,value:mockCreate.mockReturnValue('blob:download')});
  Object.defineProperty(URL,'revokeObjectURL',{configurable:true,value:mockRevoke});
});
afterEach(()=>{
  jest.runOnlyPendingTimers();jest.useRealTimers();
  for(const [target,key,descriptor] of [[globalThis,'navigator',navigatorDescriptor],[globalThis,'document',documentDescriptor],[URL,'createObjectURL',createDescriptor],[URL,'revokeObjectURL',revokeDescriptor]] as const){
    if(descriptor)Object.defineProperty(target,key,descriptor);else Reflect.deleteProperty(target,key);
  }
});
it('keeps a permission refusal explicit and offers a download without silently retrying the selector',async()=>{
  mockShare.mockRejectedValueOnce(new Error('Permission denied'));
  await expect(requestAttachmentShare(attachment(),'Comprador QA')).rejects.toThrow('Descargar copia');
  expect(mockShare).toHaveBeenCalledTimes(1);expect(mockClick).not.toHaveBeenCalled();
});
it('downloads an explicit copy without opening any sharing application',()=>{
  downloadAttachmentCopy(attachment());expect(mockClick).toHaveBeenCalledTimes(1);expect(mockShare).not.toHaveBeenCalled();
  expect(mockRevoke).not.toHaveBeenCalled();jest.advanceTimersByTime(30_000);expect(mockRevoke).toHaveBeenCalledWith('blob:download');
});
it('falls back to a download when file sharing is unavailable',async()=>{
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{canShare:()=>false,share:mockShare}});
  await expect(requestAttachmentShare(attachment(),'Comprador QA')).resolves.toBe('downloaded');
  expect(mockClick).toHaveBeenCalledTimes(1);expect(mockShare).not.toHaveBeenCalled();
});
it('treats cancellation as cancellation and never downloads automatically',async()=>{
  const error=new Error('Cancelled');error.name='AbortError';mockShare.mockRejectedValueOnce(error);
  await expect(requestAttachmentShare(attachment(),'Comprador QA')).resolves.toBe('cancelled');expect(mockClick).not.toHaveBeenCalled();
});
it('rejects copies without a browser file before creating a download',()=>{
  expect(()=>downloadAttachmentCopy({...attachment(),webFile:undefined})).toThrow('Vuelve a seleccionarlo');expect(mockClick).not.toHaveBeenCalled();
});
