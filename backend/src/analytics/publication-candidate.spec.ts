import { loadHistoricalEvaluationInputs,loadCurrentPredictionSnapshot } from './historical-price-snapshots.js';
import { evaluateHistoricalSnapshots } from './predictive-engine.js';
import { canonicalSha256 } from './evaluation-integrity.js';
import { preparePublicationCandidate } from './publication-candidate.js';
import type { StoredEvaluation } from './evaluation-store.js';
const takenAt='2026-10-12T15:00:00.000Z';
async function fixture(flat=false) {
  const query=async(_sql:string,parameters:unknown[])=>{
    const rows=[];
    for(let time=Date.parse(String(parameters[2]));time<=Date.parse(String(parameters[3]));time+=7*86400000) {
      const weekStart=new Date(time).toISOString().slice(0,10);const index=(time-Date.parse('2026-04-13'))/(7*86400000);
      for(let sale=0;sale<5;sale++)rows.push({operationType:'sale' as const,operationId:`${weekStart}-${sale}`,varietyId:'v',varietyName:'Variedad',weekStart,sacks:1,weightKg:'10.000',merchandiseCents:flat||index%2===0?'2000':'4000',compensationIds:[] as string[]});
    }
    return rows;
  };
  const inputs=await loadHistoricalEvaluationInputs(query,'b','v','2026-10-12');
  const current=await loadCurrentPredictionSnapshot(query,'b','v',takenAt);
  const stored:StoredEvaluation={id:'evaluation',varietyId:'v',asOf:'2026-10-12',algorithmVersion:'weekly-mean-4-v1',inputsHash:canonicalSha256(inputs),createdAt:new Date(takenAt),retainUntil:new Date('2031-10-12'),evidence:{inputs,evaluation:evaluateHistoricalSnapshots(inputs.folds)}};
  return {stored,current};
}
it('prepares only the current commercial week with evidence and review still required',async()=>{
  const {stored,current}=await fixture();const candidate=preparePublicationCandidate(stored,current,takenAt);
  expect(candidate).toMatchObject({weekStart:'2026-10-12',weekEnd:'2026-10-18',priceSolesPerKg:'3.0000',lowerSolesPerKg:'2.0000',upperSolesPerKg:'4.0000',reviewRequired:true,publicationAvailable:false});
});
it('rejects obsolete week, another business or variety, and a stale current read',async()=>{
  const {stored,current}=await fixture();
  expect(()=>preparePublicationCandidate(stored,{...current,cutoffExclusive:'2026-10-19T15:00:00.000Z'},'2026-10-19T15:00:00.000Z')).toThrow('venció');
  expect(()=>preparePublicationCandidate(stored,{...current,businessId:'other'},takenAt)).toThrow('negocio');
  expect(()=>preparePublicationCandidate(stored,{...current,varietyId:'other'},takenAt)).toThrow('variedad');
  expect(()=>preparePublicationCandidate(stored,current,'2026-10-12T15:01:00.000Z')).toThrow('instante actual');
});
it('blocks changed commercial facts but does not treat a catalog rename as a price revision',async()=>{
  const {stored,current}=await fixture();const changed=structuredClone(current);changed.observations[0]!.merchandiseCents='2500';
  expect(()=>preparePublicationCandidate(stored,changed,takenAt)).toThrow('entradas comerciales cambiaron');
  const renamed=structuredClone(current);renamed.observations.forEach(row=>{row.varietyName='Nombre actualizado';});renamed.points.forEach(point=>{point.varietyName='Nombre actualizado';});
  expect(preparePublicationCandidate(stored,renamed,takenAt).priceSolesPerKg).toBe('3.0000');
});
it('rejects unverifiable input hash, nonreproducible evaluation and inadequate improvement',async()=>{
  const {stored,current}=await fixture();
  expect(()=>preparePublicationCandidate({...stored,inputsHash:'wrong'},current,takenAt)).toThrow('huella');
  const changed=structuredClone(stored);changed.evidence.evaluation.maeSolesPerKg='0.0000';
  expect(()=>preparePublicationCandidate(changed,current,takenAt)).toThrow('reproducibles');
  const flat=await fixture(true);expect(()=>preparePublicationCandidate(flat.stored,flat.current,takenAt)).toThrow('no cumple');
});
