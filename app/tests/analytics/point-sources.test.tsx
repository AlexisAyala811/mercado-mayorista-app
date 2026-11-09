import React from 'react';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {PointSources} from '@/features/analytics/screens/point-sources';
import type {AnalyticsPoint} from '@/domain/analytics/analytics';
jest.mock('@/ui/components',()=>({AppButton:(props:object)=>jest.requireActual('react').createElement('test-button',props)}));

const point:AnalyticsPoint={operationType:'sale',varietyId:'variety',varietyName:'Papa QA',weekStart:'2026-10-05',weekEnd:'2026-10-11',complete:true,operationCount:21,sacks:21,weightKg:'210.000',merchandiseCents:'52500',priceSolesPerKg:'2.5000',operationIds:Array.from({length:21},(_,i)=>`operation-${String(i+1).padStart(2,'0')}`),compensationIds:['return-01']};
function button(root:ReactTestRenderer,label:string){return root.root.findAll(node=>String(node.type)==='test-button'&&node.props.label===label)[0];}
function rendered(root:ReactTestRenderer){return JSON.stringify(root.toJSON());}
beforeEach(()=>{(globalThis as typeof globalThis & {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;});

it('reveals separate source references only when requested and keeps the central quantities intact',async()=>{
  Object.freeze(point.operationIds);Object.freeze(point.compensationIds);Object.freeze(point);
  let root!:ReactTestRenderer;await act(async()=>{root=create(<PointSources point={point}/>);});
  expect(rendered(root)).not.toContain('operation-01');
  await act(async()=>button(root,'Ver referencias del análisis').props.onPress());
  expect(button(root,'Ocultar referencias').props.accessibilityState).toEqual({expanded:true});
  expect(rendered(root)).toContain('operation-01');// Spec 011 (CL-FM14): returns are not shown in the app.
  expect(rendered(root)).not.toContain('return-01');
  expect(point.weightKg).toBe('210.000');expect(point.operationCount).toBe(21);
  await act(async()=>root.unmount());
});

it('reaches the final operation beyond the first twenty and resets pagination when collapsed',async()=>{
  let root!:ReactTestRenderer;await act(async()=>{root=create(<PointSources point={point}/>);});
  await act(async()=>button(root,'Ver referencias del análisis').props.onPress());
  expect(rendered(root)).not.toContain('operation-21');
  await act(async()=>button(root,'Referencias siguientes').props.onPress());
  expect(rendered(root)).toContain('operation-21');expect(rendered(root)).not.toContain('operation-01');
  expect(button(root,'Referencias siguientes').props.disabled).toBe(true);
  await act(async()=>button(root,'Ocultar referencias').props.onPress());
  await act(async()=>button(root,'Ver referencias del análisis').props.onPress());
  expect(rendered(root)).toContain('operation-01');expect(button(root,'Referencias anteriores').props.disabled).toBe(true);
  await act(async()=>root.unmount());
});

it('does not expose old references or an empty out-of-range page when the result shrinks',async()=>{
  let root!:ReactTestRenderer;await act(async()=>{root=create(<PointSources point={point}/>);});
  await act(async()=>button(root,'Ver referencias del análisis').props.onPress());
  await act(async()=>button(root,'Referencias siguientes').props.onPress());
  await act(async()=>root.update(<PointSources point={{...point,operationCount:1,operationIds:['new-operation'],compensationIds:[]}}/>));
  expect(rendered(root)).toContain('new-operation');expect(rendered(root)).not.toContain('operation-21');expect(rendered(root)).not.toContain('return-01');
  expect(button(root,'Referencias siguientes')).toBeUndefined();await act(async()=>root.unmount());
});
