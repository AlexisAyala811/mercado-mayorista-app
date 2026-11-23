import {NotFoundException} from '@nestjs/common';
import type {EntityManager} from 'typeorm';
import {CommercialCharacteristicEntity,type CharacteristicKind} from './entities/commercial-characteristic.entity.js';

export type CommercialInput={qualityId?:string|null;originId?:string|null};
export type CommercialSnapshot={qualityId:string|null;qualityName:string|null;originId:string|null;originName:string|null};

export async function resolveCommercialSnapshot(manager:EntityManager,businessId:string,input:CommercialInput,previous?:Partial<CommercialSnapshot>):Promise<CommercialSnapshot>{
  async function resolve(kind:CharacteristicKind,id:string|null|undefined,oldId:string|null|undefined,oldName:string|null|undefined){
    if(id===undefined&&previous)return{id:oldId??null,name:oldName??null};
    if(id===null||id===undefined)return{id:null,name:null};
    if(previous&&id===oldId&&oldName)return{id,name:oldName};
    const option=await manager.getRepository(CommercialCharacteristicEntity).findOne({where:{id,businessId,kind,isActive:true},lock:{mode:'pessimistic_read'}});
    if(!option)throw new NotFoundException(kind==='quality'?'Calidad no disponible en el catálogo del negocio.':'Procedencia no disponible en el catálogo del negocio.');
    return{id:option.id,name:option.name};
  }
  const quality=await resolve('quality',input.qualityId,previous?.qualityId,previous?.qualityName);
  const origin=await resolve('origin',input.originId,previous?.originId,previous?.originName);
  return{qualityId:quality.id,qualityName:quality.name,originId:origin.id,originName:origin.name};
}
