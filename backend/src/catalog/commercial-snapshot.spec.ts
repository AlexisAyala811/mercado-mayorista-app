import {NotFoundException} from '@nestjs/common';
import type {EntityManager} from 'typeorm';
import {resolveCommercialSnapshot} from './commercial-snapshot.js';

const previous={qualityId:'quality-a',qualityName:'Calidad original',originId:'origin-a',originName:'Origen original'};
function fixture(){const findOne=vi.fn().mockImplementation(async({where})=>({id:where.id,name:where.kind==='quality'?'Calidad actual':'Origen actual'}));return{findOne,manager:{getRepository:()=>({findOne})} as unknown as EntityManager};}
it('represents old unclassified input as null pairs without reading a catalog',async()=>{
  const {findOne,manager}=fixture();expect(await resolveCommercialSnapshot(manager,'business-a',{})).toEqual({qualityId:null,qualityName:null,originId:null,originName:null});expect(findOne).not.toHaveBeenCalled();
});
it('reads the selected active option under the authenticated business and dimension',async()=>{
  const {findOne,manager}=fixture();expect(await resolveCommercialSnapshot(manager,'business-a',{qualityId:'quality-a',originId:'origin-a'})).toEqual({qualityId:'quality-a',qualityName:'Calidad actual',originId:'origin-a',originName:'Origen actual'});
  expect(findOne).toHaveBeenCalledWith({where:{id:'quality-a',businessId:'business-a',kind:'quality',isActive:true},lock:{mode:'pessimistic_read'}});
});
it.each([{}, {qualityId:'quality-a',originId:'origin-a'}])('preserves historical labels when a correction keeps original selections',async input=>{
  const {findOne,manager}=fixture();expect(await resolveCommercialSnapshot(manager,'business-a',input,previous)).toEqual(previous);expect(findOne).not.toHaveBeenCalled();
});
it('allows explicit unknown only in the corrected version',async()=>{
  const {manager}=fixture();expect(await resolveCommercialSnapshot(manager,'business-a',{qualityId:null},previous)).toEqual({...previous,qualityId:null,qualityName:null});expect(previous.qualityName).toBe('Calidad original');
});
it('does not carry the original label when a different option is selected',async()=>{
  const {findOne,manager}=fixture();expect((await resolveCommercialSnapshot(manager,'business-a',{qualityId:'quality-b'},previous)).qualityName).toBe('Calidad actual');expect(findOne).toHaveBeenCalledTimes(1);
});
it('rejects inactive, foreign or wrong-dimension selections instead of trusting client labels',async()=>{
  const {findOne,manager}=fixture();findOne.mockResolvedValue(null);await expect(resolveCommercialSnapshot(manager,'business-a',{qualityId:'unavailable'})).rejects.toBeInstanceOf(NotFoundException);
});
