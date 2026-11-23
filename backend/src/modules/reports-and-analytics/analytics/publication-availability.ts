import type { EntityManager } from 'typeorm';
import type { StoredEvaluation } from './evaluation-store.js';
import { loadCurrentPredictionSnapshot } from './historical-price-snapshots.js';
import { preparePublicationCandidate } from './publication-candidate.js';
import { PredictionInputError } from './prediction-input-error.js';

export type PublicationAvailability={state:'not_checked_historical'|'not_published'|'current'|'requires_reevaluation';publicationId:string|null;evaluationId:string|null;checkedAt:string;message:string};
/** Revalidate the latest published version; never replace or recalculate its stored forecast. */
export async function publicationAvailability(manager:EntityManager,businessId:string,varietyId:string,takenAt:string):Promise<PublicationAvailability>{
  const rows=await manager.query<(StoredEvaluation&{publicationId:string})[]>(`
    SELECT p.id AS "publicationId",e.id,e.variety_id AS "varietyId",e.as_of::text AS "asOf",e.algorithm_version AS "algorithmVersion",
      e.inputs_hash AS "inputsHash",e.created_at AS "createdAt",e.retain_until AS "retainUntil",e.evidence
    FROM analytics_publications p JOIN analytics_evaluations e ON e.id=p.evaluation_id AND e.business_id=p.business_id AND e.variety_id=p.variety_id
    WHERE p.business_id=$1 AND p.variety_id=$2 ORDER BY p.created_at DESC,p.id DESC LIMIT 1`,[businessId,varietyId]);
  const saved=rows[0];
  if(!saved)return {state:'not_published',publicationId:null,evaluationId:null,checkedAt:takenAt,message:'No hay una versión publicada para esta variedad. Las evaluaciones conservadas se consultan por separado.'};
  const reference={publicationId:saved.publicationId,evaluationId:saved.id,checkedAt:takenAt};
  try{
    const current=await loadCurrentPredictionSnapshot((sql,parameters)=>manager.query(sql,parameters),businessId,varietyId,takenAt);
    preparePublicationCandidate(saved,current,takenAt);
    return {...reference,state:'current',message:'La última publicación conserva datos, evaluación y revisión válidos para la semana actual.'};
  }catch(cause){
    if(!(cause instanceof PredictionInputError))throw cause;
    return {...reference,state:'requires_reevaluation',message:`La última publicación requiere reevaluación para uso actual: ${cause.message} Su versión original permanece en el historial.`};
  }
}
