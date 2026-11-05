import React from 'react';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {Platform} from 'react-native';
import {useBrowserTraversalGuard} from '@/navigation/use-browser-traversal-guard';
import type {BrowserTraversalEvent,BrowserTraversalNavigation} from '@/navigation/browser-traversal';

const originalOs=Object.getOwnPropertyDescriptor(Platform,'OS');
const originalWindow=Object.getOwnPropertyDescriptor(globalThis,'window');
let listener:((event:BrowserTraversalEvent)=>void)|undefined;
let navigation:BrowserTraversalNavigation;
const requestExit=jest.fn();const onError=jest.fn();const allowed={current:false};
function Harness({enabled=true}:{enabled?:boolean}){useBrowserTraversalGuard(enabled,allowed,requestExit,onError);return null;}
function traversal():BrowserTraversalEvent{return {navigationType:'traverse',cancelable:true,hashChange:false,downloadRequest:null,destination:{key:'previous-entry'},preventDefault:jest.fn()};}

beforeEach(()=>{
  (globalThis as typeof globalThis & {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
  jest.clearAllMocks();listener=undefined;allowed.current=false;
  navigation={addEventListener:jest.fn((_name,handler)=>{listener=handler;}),removeEventListener:jest.fn(),traverseTo:jest.fn(()=>({committed:Promise.resolve(),finished:Promise.resolve()}))};
  Object.defineProperty(Platform,'OS',{value:'web',configurable:true});
  Object.defineProperty(globalThis,'window',{value:{navigation},configurable:true});
});
afterEach(()=>{
  if(originalOs)Object.defineProperty(Platform,'OS',originalOs);
  if(originalWindow)Object.defineProperty(globalThis,'window',originalWindow);
  else Reflect.deleteProperty(globalThis,'window');
});

it('registers only while needed and lets an approved replay continue',async()=>{
  let root!:ReactTestRenderer;await act(async()=>{root=create(<Harness enabled={false}/>);});
  expect(navigation.addEventListener).not.toHaveBeenCalled();
  await act(async()=>root.update(<Harness/>));
  const blocked=traversal();listener!(blocked);expect(blocked.preventDefault).toHaveBeenCalled();
  allowed.current=true;const approved=traversal();listener!(approved);expect(approved.preventDefault).not.toHaveBeenCalled();
  await act(async()=>root.update(<Harness enabled={false}/>));expect(navigation.removeEventListener).toHaveBeenCalledWith('navigate',expect.any(Function));
  await act(async()=>root.unmount());
});

it('reports a replay failure after approval disables the guard while the screen remains mounted',async()=>{
  let reject!:(cause:Error)=>void;
  jest.mocked(navigation.traverseTo).mockReturnValue({committed:Promise.resolve(),finished:new Promise((_done,fail)=>{reject=fail;})});
  let root!:ReactTestRenderer;await act(async()=>{root=create(<Harness/>);});
  listener!(traversal());requestExit.mock.calls[0][0]();
  await act(async()=>root.update(<Harness enabled={false}/>));
  await act(async()=>reject(new Error('Target unavailable')));
  expect(onError).toHaveBeenCalledTimes(1);await act(async()=>root.unmount());
});

it('does not display a deferred replay error in a removed screen',async()=>{
  let reject!:(cause:Error)=>void;
  jest.mocked(navigation.traverseTo).mockReturnValue({committed:Promise.resolve(),finished:new Promise((_done,fail)=>{reject=fail;})});
  let root!:ReactTestRenderer;await act(async()=>{root=create(<Harness/>);});
  listener!(traversal());requestExit.mock.calls[0][0]();await act(async()=>root.unmount());
  await act(async()=>reject(new Error('Target unavailable')));
  expect(onError).not.toHaveBeenCalled();
});
