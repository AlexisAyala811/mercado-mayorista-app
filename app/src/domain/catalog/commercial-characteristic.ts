export type CommercialCharacteristic={id:string;name:string;kind:'quality'|'origin';isActive:boolean};
export type CommercialInput={qualityId?:string|null;originId?:string|null};
export type CommercialSnapshot={qualityId:string|null;qualityName:string|null;originId:string|null;originName:string|null};
export function commercialLineKey(value:CommercialInput&{varietyId:string}){return JSON.stringify([value.varietyId,value.qualityId??null,value.originId??null]);}
export function commercialDescription(value:Partial<CommercialSnapshot>){return `Calidad: ${value.qualityName??(value.qualityId?'Referencia no disponible':'No informada')} · Procedencia: ${value.originName??(value.originId?'Referencia no disponible':'No informada')}`;}
export function captureCommercialSnapshot(input:CommercialInput,qualities:readonly CommercialCharacteristic[],origins:readonly CommercialCharacteristic[],previous?:Partial<CommercialSnapshot>):CommercialSnapshot{
  function resolve(kind:'quality'|'origin'){
    const id=input[`${kind}Id`]??null;if(!id)return{id:null,name:null};
    if(previous?.[`${kind}Id`]===id&&previous[`${kind}Name`])return{id,name:previous[`${kind}Name`]!};
    const item=(kind==='quality'?qualities:origins).find(option=>option.id===id&&option.kind===kind&&option.isActive);
    if(!item)throw new Error(kind==='quality'?'Selecciona una calidad activa o «No informada».':'Selecciona una procedencia activa o «No informada».');
    return{id:item.id,name:item.name};
  }
  const quality=resolve('quality'),origin=resolve('origin');
  return{qualityId:quality.id,qualityName:quality.name,originId:origin.id,originName:origin.name};
}
export function isCommercialSnapshot(value:unknown):value is CommercialSnapshot{
  if(!value||typeof value!=='object')return false;const item=value as Record<string,unknown>;
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return (['quality','origin'] as const).every(kind=>{const id=item[`${kind}Id`],name=item[`${kind}Name`];return id===null?name===null:typeof id==='string'&&uuid.test(id)&&typeof name==='string'&&name.trim().length>0&&name.length<=120;});
}
