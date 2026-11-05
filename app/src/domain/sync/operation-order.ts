import type {SyncOperation} from './sync-operation';

function centralOrLocal(reference:string,operations:SyncOperation[]) {
  if(!reference.startsWith('@'))return reference;
  const parent=operations.find(item=>item.id===reference.slice(1));
  return parent?.status==='confirmed'&&parent.centralReference?parent.centralReference:reference;
}

function origin(item:SyncOperation,operations:SyncOperation[]) {
  if(item.type==='reception.create')return `reception:${item.centralReference??`@${item.id}`}`;
  if(item.type==='sale.create')return `sale:${item.centralReference??`@${item.id}`}`;
  const reception=item.path.match(/^\/(?:purchases\/)?receptions\/([^/]+)/);
  if(reception)return `reception:${centralOrLocal(reception[1],operations)}`;
  const account=item.path.match(/^\/accounts\/([^/]+)/);
  if(account)return `account:${centralOrLocal(account[1],operations)}`;
  const sale=item.path.match(/^\/sales\/([^/]+)/);
  if(sale)return `sale:${centralOrLocal(sale[1],operations)}`;
  const lot=item.path.match(/^\/inventory\/lots\/([^/]+)/);
  if(lot)return `lot:${centralOrLocal(lot[1],operations)}`;
  return `operation:${item.id}`;
}

export function precedingUnresolvedOperation(item:SyncOperation,operations:SyncOperation[]) {
  const position=operations.findIndex(value=>value.id===item.id);
  const key=origin(item,operations);
  return operations.slice(0,Math.max(position,0)).find(value=>
    value.status!=='confirmed'&&value.status!=='discarded'&&origin(value,operations)===key);
}
