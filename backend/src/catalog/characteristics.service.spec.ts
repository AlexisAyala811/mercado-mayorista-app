import {BadRequestException,NotFoundException} from '@nestjs/common';
import type {DataSource,Repository} from 'typeorm';
import type {AuditService} from '../audit/audit.service.js';
import {UserRole} from '../identity/entities/user.entity.js';
import {CharacteristicsService} from './characteristics.service.js';
import type {CommercialCharacteristicEntity} from './entities/commercial-characteristic.entity.js';

const identity={businessId:'business-a',businessName:'QA',userId:'user-a',username:'Mayorista',role:UserRole.Wholesaler,sessionId:'session-a',expiresAt:new Date('2099-01-01')};
function fixture(){
  const repository={findAndCount:vi.fn().mockResolvedValue([[],0]),findOne:vi.fn().mockResolvedValue(null),create:vi.fn().mockImplementation(value=>value),save:vi.fn().mockImplementation(value=>({...value,id:'new-id'})),update:vi.fn().mockResolvedValue({affected:1})};
  const manager={getRepository:vi.fn().mockReturnValue(repository)};
  const transaction=vi.fn().mockImplementation(async callback=>callback(manager));
  const audit={record:vi.fn().mockResolvedValue(undefined)};
  return{repository,manager,audit,service:new CharacteristicsService({transaction} as unknown as DataSource,audit as unknown as AuditService,repository as unknown as Repository<CommercialCharacteristicEntity>)};
}
it('scopes active paginated options to both business and dimension',async()=>{
  const {service,repository}=fixture();await service.list('business-a','origin',{limit:20,offset:100});
  expect(repository.findAndCount).toHaveBeenCalledWith(expect.objectContaining({where:{businessId:'business-a',kind:'origin',isActive:true},take:20,skip:100}));
});
it.each(['quality','origin'] as const)('creates %s with trimmed label and audit in the same transaction',async kind=>{
  const {service,repository,manager,audit}=fixture();await service.save(identity,kind,'  Opción QA  ');
  expect(repository.create).toHaveBeenCalledWith({businessId:'business-a',kind,isActive:true,name:'Opción QA'});
  expect(audit.record).toHaveBeenCalledWith(manager,expect.objectContaining({businessId:'business-a',action:`${kind}.created`,resourceType:`commercial_${kind}`}));
});
it('rejects another dimension or business before updating a name',async()=>{
  const {service,repository,audit}=fixture();await expect(service.save(identity,'origin','Nueva','foreign-id')).rejects.toBeInstanceOf(NotFoundException);
  expect(repository.findOne).toHaveBeenCalledWith({where:{id:'foreign-id',businessId:'business-a',kind:'origin',isActive:true},lock:{mode:'pessimistic_write'}});
  expect(repository.save).not.toHaveBeenCalled();expect(audit.record).not.toHaveBeenCalled();
});
it('deactivates only a scoped active option and preserves its row',async()=>{
  const {service,repository,audit}=fixture();await service.deactivate(identity,'quality','quality-a');
  expect(repository.update).toHaveBeenCalledWith({id:'quality-a',businessId:'business-a',kind:'quality',isActive:true},{isActive:false});
  expect(audit.record).toHaveBeenCalledWith(expect.anything(),expect.objectContaining({action:'quality.deactivated',resourceId:'quality-a'}));
});
it.each(['','   ','No informada','  NO INFORMADA  ','x'.repeat(121)])('does not persist an invalid or reserved label',async name=>{
  const {service,repository}=fixture();await expect(service.save(identity,'quality',name)).rejects.toBeInstanceOf(BadRequestException);expect(repository.save).not.toHaveBeenCalled();
});
