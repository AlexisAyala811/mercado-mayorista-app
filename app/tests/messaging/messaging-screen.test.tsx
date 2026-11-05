import React from 'react';
import { Platform } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { MessagingScreen } from '@/features/messaging/messaging-screen';
import { loadRecipients, loadShareHistory, loadMessagingAlerts, recordShareAttempt } from '@/services/api/messaging-api';
import { downloadAttachmentCopy, pickAttachment, releaseAttachment, requestAttachmentShare } from '@/services/messaging/attachment-sharing';
import { ApiError } from '@/services/api/api-client';
let mockSession:{accessToken:string;user:{role:string}}|null;
const mockInvalidateSession=jest.fn();
jest.mock('@/features/auth/session/session-provider', () => ({ useSession: () => ({ session:mockSession, invalidateSession:mockInvalidateSession }) }));
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), canGoBack: () => true, push: jest.fn() }) }));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'operation-a' }));
jest.mock('@/services/api/messaging-api', () => ({ loadRecipients: jest.fn(), loadShareHistory: jest.fn(), loadMessagingAlerts: jest.fn(), recordShareAttempt: jest.fn() }));
jest.mock('@/services/messaging/attachment-sharing', () => ({ downloadAttachmentCopy:jest.fn(), pickAttachment: jest.fn(), releaseAttachment: jest.fn(), requestAttachmentShare: jest.fn() }));
jest.mock('@/ui/components', () => { const react = jest.requireActual('react'); const control = (props: object) => react.createElement('test-control', props); return { AppButton: control, AppCard: control, AppScreen: control, ChoiceDialog: control, EmptyState: control, FeedbackState: control, FormField: control, LoadingState: control, ScreenHeader: control, SelectionField: control }; });
const file = { filename: 'venta.pdf', mimeType: 'application/pdf', sizeBytes: 300, uri: 'file:///cache/venta.pdf' };
beforeEach(() => {
  mockSession={accessToken:'token',user:{role:'wholesaler'}};
  jest.clearAllMocks(); jest.mocked(loadRecipients).mockResolvedValue([{ id: 'buyer-a', name: 'Cliente A', kind: 'buyer', phone: null }]);
  jest.mocked(loadShareHistory).mockResolvedValue([]); jest.mocked(pickAttachment).mockResolvedValue({ ...file });
  jest.mocked(recordShareAttempt).mockImplementation(async (_token, input) => ({ ...input, id: 'journal-a', recipientName: 'Cliente A', createdAt: 'now', updatedAt: 'now' }));
  jest.mocked(requestAttachmentShare).mockResolvedValue('sharing_requested');
  jest.mocked(loadMessagingAlerts).mockResolvedValue({ accountAlerts: [], generatedAt: 'now' });
});
function button(root: ReactTestRenderer, label: string) { return root.root.findAll(node => String(node.type) === 'test-control' && node.props.label === label)[0]; }
it('shows a share requested after UTC midnight on the previous Lima civil day', async () => {
  jest.mocked(loadShareHistory).mockResolvedValue([{ id: 'journal-a', clientOperationId: 'operation-a', recipientId: 'buyer-a', recipientKind: 'buyer', recipientName: 'Cliente A', channel: 'whatsapp', filename: 'venta.pdf', mimeType: 'application/pdf', sizeBytes: 300, state: 'sharing_requested', createdAt: '2026-10-27T00:16:40.371Z', updatedAt: '2026-10-27T00:16:40.371Z' }]);
  const root = await open();
  const rendered = JSON.stringify(root.toJSON());
  expect(rendered).toContain('26/10/2026, 19:16');
  expect(rendered).toContain('(Lima)');
  expect(rendered).not.toContain('2026-10-27T00:16');
  await act(async () => root.unmount());
});
async function open() { let root!: ReactTestRenderer; await act(async () => { root = create(<MessagingScreen />); }); return root; }
async function prepare(root: ReactTestRenderer) {
  await act(async () => button(root, 'Seleccionar PDF, Word o imagen').props.onPress());
  await act(async () => root.root.findAll(node => String(node.type) === 'test-control' && node.props.title === 'Selecciona cliente o proveedor')[0].props.onSelect({ id: 'buyer:buyer-a' }));
}
it('does not create an attempt when the file picker is cancelled', async () => {
  jest.mocked(pickAttachment).mockResolvedValue(null); const root = await open();
  await act(async () => button(root, 'Seleccionar PDF, Word o imagen').props.onPress());
  expect(recordShareAttempt).not.toHaveBeenCalled(); expect(requestAttachmentShare).not.toHaveBeenCalled();
  await act(async () => root.unmount());
});
it('prevents double share and records only a requested share, never delivery', async () => {
  const root = await open(); await prepare(root);
  const press = button(root, 'Revisado: abrir selector para compartir').props.onPress;
  await act(async () => { press(); press(); });
  expect(requestAttachmentShare).toHaveBeenCalledTimes(1);
  expect(recordShareAttempt).toHaveBeenLastCalledWith('token', expect.objectContaining({ state: 'sharing_requested', recipientId: 'buyer-a', filename: 'venta.pdf' }));
  expect(button(root, 'Revisado: abrir selector para compartir').props.disabled).toBe(true);
  await act(async () => root.unmount());
});
it('does not open the selector after the module closes during central preparation', async () => {
  let resolve!: (value: Awaited<ReturnType<typeof recordShareAttempt>>) => void;
  const root = await open(); await prepare(root);
  jest.mocked(recordShareAttempt).mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  await act(async () => button(root, 'Revisado: abrir selector para compartir').props.onPress());
  await act(async () => root.unmount());
  await act(async () => resolve({ ...file, clientOperationId: 'operation-a', recipientId: 'buyer-a', recipientKind: 'buyer', channel: 'whatsapp', state: 'prepared', id: 'journal-a', recipientName: 'Cliente A', createdAt: 'now', updatedAt: 'now' }));
  expect(requestAttachmentShare).not.toHaveBeenCalled(); expect(releaseAttachment).toHaveBeenCalled();
});
it('keeps a browser download prepared rather than declaring an external share', async () => {
  jest.mocked(requestAttachmentShare).mockResolvedValue('downloaded'); const root = await open(); await prepare(root);
  await act(async () => button(root, 'Revisado: abrir selector para compartir').props.onPress());
  expect(recordShareAttempt).toHaveBeenCalledTimes(1);
  expect(recordShareAttempt).toHaveBeenCalledWith('token', expect.objectContaining({ state: 'prepared' }));
  await act(async () => root.unmount());
});
it.each([null,{accessToken:'assistant-token',user:{role:'assistant'}}])('does not read recipients or history without a wholesaler: %j',async session=>{
  mockSession=session;const root=await open();
  expect(root.toJSON()).toBeNull();expect(loadRecipients).not.toHaveBeenCalled();expect(loadShareHistory).not.toHaveBeenCalled();
  await act(async()=>root.unmount());
});
it('ignores an old credential rejection and clears its selected file on session change',async()=>{
  const root=await open();await prepare(root);
  let reject!:(error:Error)=>void;
  jest.mocked(loadShareHistory).mockImplementationOnce(()=>new Promise((_resolve,fail)=>{reject=fail}));
  await act(async()=>button(root,'Actualizar destinatarios e historial').props.onPress());
  mockSession={accessToken:'new-token',user:{role:'wholesaler'}};
  await act(async()=>root.update(<MessagingScreen/>));
  await act(async()=>reject(new ApiError('Old session rejected',401)));
  expect(mockInvalidateSession).not.toHaveBeenCalled();
  expect(JSON.stringify(root.toJSON())).not.toContain('Old session rejected');
  expect(button(root,'Revisado: abrir selector para compartir').props.disabled).toBe(true);
  expect(releaseAttachment).toHaveBeenCalledWith(expect.objectContaining({uri:file.uri}));
  expect(loadRecipients).toHaveBeenLastCalledWith('new-token');
  await act(async()=>root.unmount());
});
it('releases a file selected after the screen closed without preparing or sharing it',async()=>{
  const root=await open();let finish!:(value:typeof file)=>void;
  jest.mocked(pickAttachment).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}));
  await act(async()=>button(root,'Seleccionar PDF, Word o imagen').props.onPress());
  await act(async()=>root.unmount());
  await act(async()=>finish({...file}));
  expect(releaseAttachment).toHaveBeenCalledWith(expect.objectContaining({uri:file.uri}));
  expect(recordShareAttempt).not.toHaveBeenCalled();expect(requestAttachmentShare).not.toHaveBeenCalled();
});
it('keeps a selected file when a replacement picker is cancelled',async()=>{
  const root=await open();await prepare(root);
  jest.mocked(pickAttachment).mockResolvedValueOnce(null);
  await act(async()=>button(root,'Seleccionar PDF, Word o imagen').props.onPress());
  expect(releaseAttachment).not.toHaveBeenCalled();
  expect(button(root,'Revisado: abrir selector para compartir').props.disabled).toBe(false);
  await act(async()=>root.unmount());
});
it('retries a lost outcome with the same operation ID without opening the selector again',async()=>{
  const root=await open();await prepare(root);
  jest.mocked(recordShareAttempt).mockResolvedValueOnce({...file,clientOperationId:'operation-a',recipientId:'buyer-a',recipientKind:'buyer',channel:'whatsapp',state:'prepared',id:'journal-a',recipientName:'Cliente A',createdAt:'now',updatedAt:'now'}).mockRejectedValueOnce(new Error('Network result lost'));
  await act(async()=>button(root,'Revisado: abrir selector para compartir').props.onPress());
  const retry=root.root.findAll(node=>node.props.actionLabel==='Reintentar registro')[0];
  expect(retry).toBeDefined();expect(requestAttachmentShare).toHaveBeenCalledTimes(1);
  await act(async()=>retry.props.onAction());
  expect(requestAttachmentShare).toHaveBeenCalledTimes(1);
  expect(recordShareAttempt).toHaveBeenLastCalledWith('token',expect.objectContaining({clientOperationId:'operation-a',state:'sharing_requested'}));
  await act(async()=>root.unmount());
});
it('offers a browser copy after a failed share without resetting or recording the attempt again',async()=>{
  const previous=Object.getOwnPropertyDescriptor(Platform,'OS');Object.defineProperty(Platform,'OS',{configurable:true,value:'web'});
  const root=await open();
  try {
    await prepare(root);jest.mocked(requestAttachmentShare).mockRejectedValueOnce(new Error('Permission denied'));
    await act(async()=>button(root,'Revisado: abrir selector para compartir').props.onPress());
    const calls=jest.mocked(recordShareAttempt).mock.calls.length;
    expect(button(root,'Descargar copia').props.disabled).toBe(false);
    await act(async()=>button(root,'Descargar copia').props.onPress());
    expect(downloadAttachmentCopy).toHaveBeenCalledTimes(1);expect(requestAttachmentShare).toHaveBeenCalledTimes(1);
    expect(recordShareAttempt).toHaveBeenCalledTimes(calls);expect(button(root,'Revisado: abrir selector para compartir').props.disabled).toBe(true);
    expect(JSON.stringify(root.toJSON())).toContain('no confirma compartición');
  }finally{await act(async()=>root.unmount());if(previous)Object.defineProperty(Platform,'OS',previous);}
});
