import {protectBrowserTraversal, type BrowserTraversalEvent, type BrowserTraversalNavigation} from '@/navigation/browser-traversal';

function fixture() {
  let listener!:(event:BrowserTraversalEvent)=>void;
  const navigation:BrowserTraversalNavigation={
    addEventListener:jest.fn((_type,callback)=>{listener=callback;}),
    removeEventListener:jest.fn(),
    traverseTo:jest.fn(()=>({committed:Promise.resolve(),finished:Promise.resolve()})),
  };
  const requestExit=jest.fn();const onError=jest.fn();const shouldBlock=jest.fn(()=>true);
  const dispose=protectBrowserTraversal(navigation,shouldBlock,requestExit,onError);
  const event:BrowserTraversalEvent={navigationType:'traverse',cancelable:true,hashChange:false,downloadRequest:null,destination:{key:'original-target'},preventDefault:jest.fn()};
  return {navigation,requestExit,onError,shouldBlock,dispose,event,fire:(value=event)=>listener(value)};
}

it('blocks traversal before the dialog and resumes only its original destination after approval',()=>{
  const f=fixture();f.fire();
  expect(f.event.preventDefault).toHaveBeenCalledTimes(1);
  expect(f.navigation.traverseTo).not.toHaveBeenCalled();
  f.requestExit.mock.calls[0][0]();
  expect(f.navigation.traverseTo).toHaveBeenCalledWith('original-target');
  expect(f.onError).not.toHaveBeenCalled();
});

it.each([
  {navigationType:'push'}, {cancelable:false}, {hashChange:true},
  {downloadRequest:'receipt.pdf'}, {destination:{key:''}},
])('leaves unrelated or non-cancelable navigation to the existing platform guards: %j',change=>{
  const f=fixture();f.fire({...f.event,...change});
  expect(f.event.preventDefault).not.toHaveBeenCalled();expect(f.requestExit).not.toHaveBeenCalled();
});

it('allows the approved replay and session retirement, and removes its own listener',()=>{
  const f=fixture();f.shouldBlock.mockReturnValue(false);f.fire();f.dispose();
  expect(f.event.preventDefault).not.toHaveBeenCalled();expect(f.requestExit).not.toHaveBeenCalled();
  expect(f.navigation.removeEventListener).toHaveBeenCalledWith('navigate',expect.any(Function));
});

it('reports a failed replay once while observing both rejected navigation promises',async()=>{
  const f=fixture();jest.mocked(f.navigation.traverseTo).mockReturnValue({committed:Promise.reject(new Error('Entry removed')),finished:Promise.reject(new Error('Entry removed'))});
  f.fire();f.requestExit.mock.calls[0][0]();await Promise.resolve();
  expect(f.onError).toHaveBeenCalledTimes(1);
});
