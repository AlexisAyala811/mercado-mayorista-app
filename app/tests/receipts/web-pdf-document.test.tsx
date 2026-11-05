import React from 'react';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import type {PDFDocumentLoadingTask} from 'pdfjs-dist';
import {WebPdfDocument} from '@/features/receipts/components/web-pdf-document';
import {loadWebPdf} from '@/services/receipts/pdfjs.web';
jest.mock('@/services/receipts/pdfjs.web',()=>({loadWebPdf:jest.fn()}));
jest.mock('@/ui/components',()=>{const react=jest.requireActual('react');const control=(props:object)=>react.createElement('test-control',props);return {AppButton:control,FeedbackState:control,LoadingState:control};});
const mockDestroy=jest.fn(async()=>undefined);const mockCancel=jest.fn();
const mockRender=jest.fn(()=>({promise:Promise.resolve(),cancel:mockCancel}));
const mockGetPage=jest.fn(async(number:number)=>({getViewport:({scale}:{scale:number})=>({width:600*scale,height:800*scale}),render:mockRender,getTextContent:async()=>({items:[{str:`Documento página ${number}`,hasEOL:true}]})}));
const task=()=>({promise:Promise.resolve({numPages:2,getPage:mockGetPage}),destroy:mockDestroy}) as unknown as PDFDocumentLoadingTask;
const windowDescriptor=Object.getOwnPropertyDescriptor(globalThis,'window');
beforeAll(()=>Object.defineProperty(globalThis,'window',{configurable:true,value:{devicePixelRatio:1}}));
afterAll(()=>{if(windowDescriptor)Object.defineProperty(globalThis,'window',windowDescriptor);});
beforeEach(()=>{(globalThis as typeof globalThis & {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;jest.clearAllMocks();jest.mocked(loadWebPdf).mockResolvedValue(task());});
async function open(documentKind?:'comprobante'|'reporte'){let root!:ReactTestRenderer;await act(async()=>{root=create(<WebPdfDocument uri="blob:pdf" documentKind={documentKind}/>,{createNodeMock:element=>element.type==='canvas'?{getContext:()=>({}),style:{},width:0,height:0}:null});});return root;}
const button=(root:ReactTestRenderer,label:string)=>root.root.findAll(node=>(node.props.accessibilityLabel??node.props.label)===label)[0]!;
it('identifies reports in accessible page labels and render recovery messages',async()=>{
  mockRender.mockImplementationOnce(()=>({promise:Promise.reject(new Error('render failed')),cancel:mockCancel}));
  const root=await open('reporte');
  expect(JSON.stringify(root.toJSON())).toContain('Reintenta la lectura del reporte.');
  await act(async()=>root.root.findAll(node=>node.props.actionLabel==='Reintentar lectura PDF')[0]!.props.onAction());
  expect(root.root.findByType('canvas').props['aria-label']).toBe('Página 1 del reporte');
  await act(async()=>button(root,'Página siguiente').props.onPress());
  expect(root.root.findByType('canvas').props['aria-label']).toBe('Página 2 del reporte');
  await act(async()=>root.unmount());
});
it('renders and exposes page text, navigates, zooms and destroys the document on close',async()=>{
  const root=await open();expect(mockGetPage).toHaveBeenCalledWith(1);expect(JSON.stringify(root.toJSON())).toContain('Documento página 1');
  await act(async()=>button(root,'Página siguiente').props.onPress());expect(mockGetPage).toHaveBeenCalledWith(2);expect(JSON.stringify(root.toJSON())).toContain('Documento página 2');expect(button(root,'Página siguiente').props.disabled).toBe(true);
  await act(async()=>button(root,'Ampliar PDF').props.onPress());expect(JSON.stringify(root.toJSON())).toContain('125');
  await act(async()=>root.unmount());expect(mockDestroy).toHaveBeenCalledTimes(1);expect(mockCancel).toHaveBeenCalled();
});
it('offers a fresh document retry after loading failure',async()=>{
  jest.mocked(loadWebPdf).mockRejectedValueOnce(new Error('worker unavailable')).mockResolvedValue(task());
  const root=await open();expect(JSON.stringify(root.toJSON())).toContain('PDF no disponible');
  await act(async()=>root.root.findAll(node=>node.props.actionLabel==='Reintentar lectura PDF')[0]!.props.onAction());
  expect(loadWebPdf).toHaveBeenCalledTimes(2);expect(JSON.stringify(root.toJSON())).toContain('Documento página 1');await act(async()=>root.unmount());
});
it('destroys a loading task that arrives after the viewer was closed',async()=>{
  let resolve!:(value:PDFDocumentLoadingTask)=>void;
  jest.mocked(loadWebPdf).mockReturnValueOnce(new Promise(done=>{resolve=done;}));
  const root=await open();await act(async()=>root.unmount());await act(async()=>resolve(task()));
  expect(mockDestroy).toHaveBeenCalledTimes(1);expect(mockGetPage).not.toHaveBeenCalled();
});
it('recovers from a failed page render by replacing the document task',async()=>{
  mockRender.mockImplementationOnce(()=>({promise:Promise.reject(new Error('render failed')),cancel:mockCancel}));
  const root=await open();expect(JSON.stringify(root.toJSON())).toContain('No se pudo mostrar esta página');
  expect(button(root,'Página siguiente').props.disabled).toBe(true);
  await act(async()=>root.root.findAll(node=>node.props.actionLabel==='Reintentar lectura PDF')[0]!.props.onAction());
  expect(mockDestroy).toHaveBeenCalledTimes(1);expect(loadWebPdf).toHaveBeenCalledTimes(2);
  expect(JSON.stringify(root.toJSON())).toContain('Documento página 1');
  await act(async()=>root.unmount());expect(mockDestroy).toHaveBeenCalledTimes(2);
});
it('ignores a late render failure after replacing the preview with another document',async()=>{
  let reject!:(error:Error)=>void;
  mockRender.mockImplementationOnce(()=>({promise:new Promise<void>((_,fail)=>{reject=fail;}),cancel:mockCancel}));
  const root=await open();expect(button(root,'Página siguiente').props.disabled).toBe(true);
  await act(async()=>root.update(<WebPdfDocument uri="blob:replacement"/>));
  expect(loadWebPdf).toHaveBeenLastCalledWith('blob:replacement');expect(mockDestroy).toHaveBeenCalledTimes(1);
  await act(async()=>reject(new Error('old render failed')));
  expect(JSON.stringify(root.toJSON())).not.toContain('PDF no disponible');
  expect(JSON.stringify(root.toJSON())).toContain('Documento página 1');
  expect(button(root,'Página siguiente').props.disabled).toBe(false);
  await act(async()=>root.unmount());
});
