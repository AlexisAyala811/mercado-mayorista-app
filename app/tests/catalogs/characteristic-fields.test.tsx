import React from 'react';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {CharacteristicFields} from '@/features/catalog/components/characteristic-fields';
import {captureCommercialSnapshot,commercialLineKey} from '@/domain/catalog/commercial-characteristic';
jest.mock('@/ui/components',()=>{const host=(props:object)=>jest.requireActual('react').createElement('test-control',props);return{SelectionField:host,ChoiceDialog:host};});
const quality={id:'11111111-1111-4111-8111-111111111111',name:'Calidad actual',kind:'quality' as const,isActive:true};
const origin={id:'22222222-2222-4222-8222-222222222222',name:'Origen actual',kind:'origin' as const,isActive:true};
const previous={qualityId:quality.id,qualityName:'Calidad original',originId:origin.id,originName:'Origen original'};
const control=(root:ReactTestRenderer,key:string,value:string)=>root.root.findAll(node=>String(node.type)==='test-control'&&node.props[key]===value)[0];
beforeEach(()=>{(globalThis as typeof globalThis&{IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;});
it('shows unknown explicitly and chooses a real option without accepting text labels as authority',async()=>{
  const onChange=jest.fn();let root!:ReactTestRenderer;await act(async()=>{root=create(<CharacteristicFields value={{}} qualities={[quality]} origins={[origin]} onChange={onChange}/>);});
  expect(control(root,'label','Calidad comercial').props.value).toBe('No informada');
  await act(async()=>control(root,'label','Calidad comercial').props.onPress());
  const dialog=control(root,'title','Seleccionar calidad comercial');expect(dialog.props.choices).toContainEqual({id:'',label:'No informada'});
  await act(async()=>dialog.props.onSelect({id:quality.id,label:quality.name}));expect(onChange).toHaveBeenCalledWith('qualityId',quality.id);
  await act(async()=>control(root,'label','Procedencia de la papa').props.onPress());await act(async()=>control(root,'title','Seleccionar procedencia de la papa').props.onSelect({id:'',label:'No informada'}));expect(onChange).toHaveBeenLastCalledWith('originId',null);
  await act(async()=>root.unmount());
});
it('keeps the historical label visible after a catalog rename or deactivation',async()=>{
  let root!:ReactTestRenderer;await act(async()=>{root=create(<CharacteristicFields value={previous} historical={previous} qualities={[quality]} origins={[]} onChange={()=>undefined}/>);});
  expect(control(root,'label','Calidad comercial').props.value).toBe('Calidad original');expect(control(root,'label','Procedencia de la papa').props.value).toBe('Origen original');await act(async()=>root.unmount());
});
it('freezes labels on capture and accepts inactive originals only when correcting their own fact',()=>{
  expect(captureCommercialSnapshot(previous,[],[],previous)).toEqual(previous);
  expect(()=>captureCommercialSnapshot(previous,[],[])).toThrow('activa');
  const source={...quality};const captured=captureCommercialSnapshot({qualityId:quality.id,originId:origin.id},[source],[origin]);source.name='Nombre futuro';expect(captured.qualityName).toBe('Calidad actual');
});
it('separates known combinations and treats omitted references like explicit unknown',()=>{
  expect(commercialLineKey({varietyId:'v'})).toBe(commercialLineKey({varietyId:'v',qualityId:null,originId:null}));
  expect(commercialLineKey({varietyId:'v',qualityId:quality.id})).not.toBe(commercialLineKey({varietyId:'v',originId:origin.id}));
});
