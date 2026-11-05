import {useEffect,useRef,type RefObject} from 'react';
import {Platform} from 'react-native';
import {protectBrowserTraversal,type BrowserTraversalNavigation} from './browser-traversal';

/** Complements navigator removal guards before a cancelable web history traversal. */
export function useBrowserTraversalGuard(
  enabled:boolean,
  allowed:RefObject<boolean>,
  requestExit:(leave:()=>void)=>void,
  onError:()=>void,
) {
  const mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  useEffect(()=>{
    if(Platform.OS!=='web'||!enabled||typeof window==='undefined')return;
    const navigation=(window as Window & {navigation?:BrowserTraversalNavigation}).navigation;
    if(!navigation||typeof navigation.traverseTo!=='function')return;
    return protectBrowserTraversal(navigation,()=>mounted.current&&!allowed.current,
      leave=>{if(mounted.current)requestExit(leave);},
      ()=>{if(mounted.current)onError();});
  },[allowed,enabled,onError,requestExit]);
}
