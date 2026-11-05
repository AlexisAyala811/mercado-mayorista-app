import type {SyncOperation} from './sync-operation';
import {isCommercialSnapshot} from '@/domain/catalog/commercial-characteristic';

type Scope={businessId:string;userId:string};
const statuses=new Set(['pending','syncing','confirmed','discarded','rejected','review']);
const text=(value:unknown):value is string=>typeof value==='string'&&value.trim().length>0;
const date=(value:unknown)=>text(value)&&Number.isFinite(Date.parse(value));

export function validateStoredQueue(value:unknown,scope:Scope):SyncOperation[]{
  if(!Array.isArray(value))throw new Error('La cola recuperada no tiene una estructura válida. Conserva los datos y revisa la recuperación.');
  const ids=new Set<string>();
  for(const item of value){
    if(!item||typeof item!=='object'||!text(item.id)||ids.has(item.id)||
      item.businessId!==scope.businessId||item.userId!==scope.userId||
      !text(item.type)||!text(item.path)||!item.path.startsWith('/')||
      !['POST','PATCH','DELETE'].includes(item.method)||!statuses.has(item.status)||
      !Number.isSafeInteger(item.attempts)||item.attempts<0||
      !date(item.createdAt)||!date(item.updatedAt)||
      !item.body||typeof item.body!=='object'||Array.isArray(item.body)||
      (item.centralReference!==undefined&&!text(item.centralReference))||
      (item.message!==undefined&&typeof item.message!=='string')||
      (item.receptionContext!==undefined&&!validReceptionContext(item.receptionContext,item.type))||
      (item.sackCharacteristics!==undefined&&(!['reception.sack-add','reception.sack-correct'].includes(item.type)||!isCommercialSnapshot(item.sackCharacteristics)||item.sackCharacteristics.qualityId!==(item.body.qualityId??null)||item.sackCharacteristics.originId!==(item.body.originId??null)))){
      throw new Error('La cola contiene una operación inválida, repetida o de otra identidad. Conserva los datos y revisa la recuperación.');
    }
    ids.add(item.id);
  }
  return value as SyncOperation[];
}

function validReceptionContext(value: unknown, type: string): boolean {
  if (type !== 'reception.create' || !value || typeof value !== 'object') return false;
  const context = value as Record<string, unknown>;
  for(const [key,kind] of [['qualities','quality'],['origins','origin']]){
    const options=context[key];if(options===undefined)continue;
    if(!Array.isArray(options)||!options.every(option=>option&&typeof option==='object'&&text(option.id)&&text(option.name)&&option.name.length<=120&&option.kind===kind&&option.isActive===true))return false;
  }
  if (typeof context.providerName !== 'string' || typeof context.vehiclePlate !== 'string' || !Array.isArray(context.varieties)) return false;
  const ids = new Set<string>();
  return context.varieties.every((variety: unknown) => {
    if (!variety || typeof variety !== 'object') return false;
    const item = variety as Record<string, unknown>;
    if (!text(item.id) || !text(item.name) || ids.has(item.id)) return false;
    ids.add(item.id);
    return true;
  });
}
