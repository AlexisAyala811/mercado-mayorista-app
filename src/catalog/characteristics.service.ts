import {BadRequestException,ConflictException,Injectable,NotFoundException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {DataSource,QueryFailedError,type Repository} from 'typeorm';
import {AuditService} from '../audit/audit.service.js';
import {toPage,type PageQueryDto} from '../common/http/page-query.dto.js';
import type {SessionIdentity} from '../identity/application/ports/session-identity-reader.js';
import {CommercialCharacteristicEntity,type CharacteristicKind} from './entities/commercial-characteristic.entity.js';

@Injectable()
export class CharacteristicsService {
  constructor(private readonly dataSource:DataSource,private readonly audit:AuditService,
    @InjectRepository(CommercialCharacteristicEntity) private readonly repository:Repository<CommercialCharacteristicEntity>){ }

  async list(businessId:string,kind:CharacteristicKind,page:PageQueryDto){
    const [items,total]=await this.repository.findAndCount({where:{businessId,kind,isActive:true},order:{name:'ASC',id:'ASC'},skip:page.offset,take:page.limit});
    return toPage(items,total,page);
  }

  async save(identity:SessionIdentity,kind:CharacteristicKind,name:string,id?:string){
    const normalized=name.trim();
    if(!normalized||normalized.length>120)throw new BadRequestException('El nombre debe tener entre 1 y 120 caracteres.');
    if(normalized.toLocaleLowerCase('es-PE')==='no informada')throw new BadRequestException('«No informada» ya está disponible sin crear un registro.');
    try{
      return await this.dataSource.transaction(async manager=>{
        const repository=manager.getRepository(CommercialCharacteristicEntity);
        const item=id?await repository.findOne({where:{id,businessId:identity.businessId,kind,isActive:true},lock:{mode:'pessimistic_write'}}):repository.create({businessId:identity.businessId,kind,isActive:true,name:normalized});
        if(!item)throw new NotFoundException('Característica no encontrada.');
        item.name=normalized;
        const saved=await repository.save(item);
        await this.audit.record(manager,{action:`${kind}.${id?'updated':'created'}`,actorUserId:identity.userId,businessId:identity.businessId,resourceId:saved.id,resourceType:`commercial_${kind}`});
        return saved;
      });
    }catch(error){
      if(error instanceof QueryFailedError&&(error.driverError as {code?:string}).code==='23505')throw new ConflictException('Ya existe una opción activa con ese nombre en esta lista.');
      throw error;
    }
  }

  async deactivate(identity:SessionIdentity,kind:CharacteristicKind,id:string){
    await this.dataSource.transaction(async manager=>{
      const result=await manager.getRepository(CommercialCharacteristicEntity).update({id,businessId:identity.businessId,kind,isActive:true},{isActive:false});
      if(!result.affected)throw new NotFoundException('Característica no encontrada.');
      await this.audit.record(manager,{action:`${kind}.deactivated`,actorUserId:identity.userId,businessId:identity.businessId,resourceId:id,resourceType:`commercial_${kind}`});
    });
  }
}
