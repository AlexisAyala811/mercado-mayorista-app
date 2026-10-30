import { randomUUID } from 'node:crypto';
import { ConflictException,ForbiddenException,Injectable,NotFoundException,ServiceUnavailableException,UnprocessableEntityException } from '@nestjs/common';
import { DataSource,type EntityManager } from 'typeorm';
import { AuditService } from '../audit/audit.service.js';
import type { PageQueryDto } from '../common/http/page-query.dto.js';
import { toPage } from '../common/http/page-query.dto.js';
import type { SessionIdentity } from '../identity/application/ports/session-identity-reader.js';
import { UserRole } from '../identity/entities/user.entity.js';
import type { CreatePredictionPublicationDto,EvaluationListQueryDto } from './analytics-query.dto.js';
import type { StoredEvaluation } from './evaluation-store.js';
import { loadCurrentPredictionSnapshot,loadPublicationWeekSnapshot } from './historical-price-snapshots.js';
import { comparePublicationOutcome } from './publication-outcome.js';
import { preparePublicationCandidate } from './publication-candidate.js';
import { PredictionInputError } from './prediction-input-error.js';
type Candidate=ReturnType<typeof preparePublicationCandidate>;
type PublishedForecast=Omit<Candidate,'reviewRequired'|'publicationAvailable'>&{reviewRequired:false;publicationAvailable:true};
export type PredictionPublication={id:string;evaluationId:string;varietyId:string;reviewedByUserId:string;reviewedAt:Date;createdAt:Date;retainUntil:Date;forecast:PublishedForecast};
const fields=`id,evaluation_id AS "evaluationId",variety_id AS "varietyId",reviewed_by_user_id AS "reviewedByUserId",reviewed_at AS "reviewedAt",created_at AS "createdAt",retain_until AS "retainUntil",forecast`;
function authorize(identity:SessionIdentity){if(identity.role!==UserRole.Wholesaler)throw new ForbiddenException('Solo el Mayorista puede publicar estimaciones.');}
function pg(cause:unknown,key:'code'|'constraint'):string|null{if(!cause||typeof cause!=='object')return null;const record=cause as Record<string,unknown>;if(typeof record[key]==='string')return record[key];return 'driverError' in cause?pg(cause.driverError,key):null;}
@Injectable()
export class AnalyticsPublicationService {
  constructor(private readonly dataSource:DataSource,private readonly audit:AuditService){}
  protected now():Date{return new Date();}
  private async candidate(manager:EntityManager,identity:SessionIdentity,id:string){
    const rows=await manager.query<StoredEvaluation[]>(`SELECT id,variety_id AS "varietyId",as_of::text AS "asOf",algorithm_version AS "algorithmVersion",inputs_hash AS "inputsHash",created_at AS "createdAt",retain_until AS "retainUntil",evidence FROM analytics_evaluations WHERE business_id=$1 AND id=$2`,[identity.businessId,id]);
    if(!rows[0])throw new NotFoundException('Evaluación no disponible.');
    const takenAt=this.now().toISOString();
    const current=await loadCurrentPredictionSnapshot((sql,parameters)=>manager.query(sql,parameters),identity.businessId,rows[0].varietyId,takenAt);
    return preparePublicationCandidate(rows[0],current,takenAt);
  }
  async preview(identity:SessionIdentity,id:string){
    authorize(identity);
    try{const c=await this.dataSource.transaction('REPEATABLE READ',manager=>this.candidate(manager,identity,id));
      return {evaluationId:c.evaluationId,varietyId:c.varietyId,inputsHash:c.inputsHash,takenAt:c.takenAt,timeZone:c.timeZone,weekStart:c.weekStart,weekEnd:c.weekEnd,algorithmVersion:c.algorithmVersion,
        variables:c.variables,targetCoveragePercent:c.targetCoveragePercent,maeSolesPerKg:c.maeSolesPerKg,baselineMaeSolesPerKg:c.baselineMaeSolesPerKg,coveredWeeks:c.coveredWeeks,observedCoveragePercent:c.observedCoveragePercent,reviewRequired:true,publicationAvailable:false};
    }catch(cause){if(cause instanceof PredictionInputError)throw new ConflictException(cause.message);throw cause;}
  }
  async publish(identity:SessionIdentity,input:CreatePredictionPublicationDto){
    authorize(identity);if(input.reviewed!==true)throw new UnprocessableEntityException('Confirma la revisión de la evidencia.');
    for(let attempt=0;attempt<3;attempt++)try{
      return await this.dataSource.transaction('REPEATABLE READ',async manager=>{
        const existing=await manager.query<PredictionPublication[]>(`SELECT ${fields} FROM analytics_publications WHERE business_id=$1 AND client_operation_id=$2`,[identity.businessId,input.clientOperationId]);
        if(existing[0]){if(existing[0].evaluationId!==input.evaluationId)throw new ConflictException('La petición ya corresponde a otra publicación.');return existing[0];}
        const candidate=await this.candidate(manager,identity,input.evaluationId);
        const forecast:PublishedForecast={...candidate,reviewRequired:false,publicationAvailable:true};
        const rows=await manager.query<PredictionPublication[]>(`INSERT INTO analytics_publications(id,business_id,variety_id,evaluation_id,client_operation_id,forecast,reviewed_by_user_id,reviewed_at)
          VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8) RETURNING ${fields}`,[randomUUID(),identity.businessId,candidate.varietyId,input.evaluationId,input.clientOperationId,JSON.stringify(forecast),identity.userId,candidate.takenAt]);
        const saved=rows[0]!;
        await this.audit.record(manager,{businessId:identity.businessId,actorUserId:identity.userId,action:'analytics.prediction.published',resourceType:'analytics_publication',resourceId:saved.id,details:{evaluationId:input.evaluationId,inputsHash:candidate.inputsHash,weekStart:candidate.weekStart}});
        return saved;
      });
    }catch(cause){if(cause instanceof PredictionInputError)throw new ConflictException(cause.message);
      if(pg(cause,'code')==='23505'&&pg(cause,'constraint')!=='uq_analytics_publications_operation')throw cause;
      if(!['40001','40P01','23505'].includes(pg(cause,'code')??''))throw cause;}
    throw new ServiceUnavailableException('No se pudo publicar. Reintenta la misma petición.');
  }
  async get(identity:SessionIdentity,id:string){authorize(identity);const rows=await this.dataSource.query<PredictionPublication[]>(`SELECT ${fields} FROM analytics_publications WHERE business_id=$1 AND id=$2`,[identity.businessId,id]);if(!rows[0])throw new NotFoundException('Publicación no disponible.');return rows[0];}
  async outcome(identity:SessionIdentity,id:string){authorize(identity);return this.dataSource.transaction('REPEATABLE READ',async manager=>(await this.measureOutcome(manager,identity,id)).result);}
  private async measureOutcome(manager:EntityManager,identity:SessionIdentity,id:string){
    const rows=await manager.query<PredictionPublication[]>(`SELECT ${fields} FROM analytics_publications WHERE business_id=$1 AND id=$2`,[identity.businessId,id]);
    const saved=rows[0];if(!saved)throw new NotFoundException('Publicación no disponible.');
    const takenAt=this.now().toISOString();const asOf=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima'}).format(new Date(takenAt));
    const pending=comparePublicationOutcome(saved.forecast,asOf,null);
    if(pending.state==='week_in_progress')return {result:{publicationId:id,takenAt,timeZone:'America/Lima',...pending,operationIds:[],compensationIds:[],excluded:[]},snapshot:null};
    const snapshot=await loadPublicationWeekSnapshot((sql,parameters)=>manager.query(sql,parameters),identity.businessId,saved.varietyId,saved.forecast.weekStart,saved.forecast.weekEnd,takenAt);
    const point=snapshot.points[0];
    return {result:{publicationId:id,takenAt,timeZone:'America/Lima',...comparePublicationOutcome(saved.forecast,asOf,point?{priceSolesPerKg:point.priceSolesPerKg,weightKg:point.weightKg,operationCount:point.operationCount}:null),
      operationIds:point?.operationIds??[],compensationIds:point?.compensationIds??[],excluded:snapshot.excluded},snapshot};
  }
  async saveOutcome(identity:SessionIdentity,id:string,clientOperationId:string){
    authorize(identity);
    for(let attempt=0;attempt<3;attempt++)try{
      return await this.dataSource.transaction('REPEATABLE READ',async manager=>{
        const existing=await manager.query<SavedOutcome[]>(`SELECT ${outcomeFields} FROM analytics_outcomes WHERE business_id=$1 AND client_operation_id=$2`,[identity.businessId,clientOperationId]);
        if(existing[0]){if(existing[0].publicationId!==id)throw new ConflictException('La petición ya corresponde a otra publicación.');return existing[0];}
        const evidence=await this.measureOutcome(manager,identity,id);
        if(evidence.result.state==='week_in_progress')throw new ConflictException('Espera al cierre de la semana para conservar la comparación.');
        const rows=await manager.query<SavedOutcome[]>(`INSERT INTO analytics_outcomes(id,business_id,publication_id,client_operation_id,evidence,created_by_user_id)
          VALUES($1,$2,$3,$4,$5::jsonb,$6) RETURNING ${outcomeFields}`,[randomUUID(),identity.businessId,id,clientOperationId,JSON.stringify(evidence),identity.userId]);
        const saved=rows[0]!;
        await this.audit.record(manager,{businessId:identity.businessId,actorUserId:identity.userId,action:'analytics.outcome.saved',resourceType:'analytics_outcome',resourceId:saved.id,details:{publicationId:id,takenAt:evidence.result.takenAt}});
        return saved;
      });
    }catch(cause){
      if(pg(cause,'code')==='23505'&&pg(cause,'constraint')!=='uq_analytics_outcomes_operation')throw cause;
      if(!['40001','40P01','23505'].includes(pg(cause,'code')??''))throw cause;
    }
    throw new ServiceUnavailableException('No se pudo conservar la comparación. Reintenta la misma petición.');
  }
  async getOutcome(identity:SessionIdentity,id:string,outcomeId:string){
    authorize(identity);
    const rows=await this.dataSource.query<SavedOutcome[]>(`SELECT ${outcomeFields} FROM analytics_outcomes WHERE business_id=$1 AND publication_id=$2 AND id=$3`,[identity.businessId,id,outcomeId]);
    if(!rows[0])throw new NotFoundException('Comparación no disponible.');return rows[0];
  }
  async listOutcomes(identity:SessionIdentity,id:string,page:PageQueryDto){
    authorize(identity);return this.dataSource.transaction('REPEATABLE READ',async manager=>{
      const exists=await manager.query<{id:string}[]>('SELECT id FROM analytics_publications WHERE business_id=$1 AND id=$2',[identity.businessId,id]);
      if(!exists[0])throw new NotFoundException('Publicación no disponible.');
      const items=await manager.query<Omit<SavedOutcome,'result'>[]>(`SELECT id,publication_id AS "publicationId",created_at AS "createdAt",retain_until AS "retainUntil",created_by_user_id AS "createdByUserId" FROM analytics_outcomes WHERE business_id=$1 AND publication_id=$2 ORDER BY created_at DESC,id DESC LIMIT $3 OFFSET $4`,[identity.businessId,id,page.limit,page.offset]);
      const counts=await manager.query<{total:number}[]>('SELECT COUNT(*)::int AS total FROM analytics_outcomes WHERE business_id=$1 AND publication_id=$2',[identity.businessId,id]);
      return toPage(items,counts[0]!.total,page);
    });
  }
  async list(identity:SessionIdentity,page:EvaluationListQueryDto){authorize(identity);return this.dataSource.transaction('REPEATABLE READ',async manager=>{
    const items=await manager.query<(Omit<PredictionPublication,'forecast'>&{weekStart:string;weekEnd:string;algorithmVersion:string})[]>(`SELECT id,evaluation_id AS "evaluationId",variety_id AS "varietyId",reviewed_by_user_id AS "reviewedByUserId",reviewed_at AS "reviewedAt",created_at AS "createdAt",retain_until AS "retainUntil",forecast->>'weekStart' AS "weekStart",forecast->>'weekEnd' AS "weekEnd",forecast->>'algorithmVersion' AS "algorithmVersion"
      FROM analytics_publications WHERE business_id=$1 AND variety_id=$2 ORDER BY created_at DESC,id DESC LIMIT $3 OFFSET $4`,[identity.businessId,page.varietyId,page.limit,page.offset]);
    const counts=await manager.query<{total:number}[]>('SELECT COUNT(*)::int AS total FROM analytics_publications WHERE business_id=$1 AND variety_id=$2',[identity.businessId,page.varietyId]);
    return toPage(items,counts[0]!.total,page);
  });}
}

type SavedOutcome={id:string;publicationId:string;createdAt:Date;retainUntil:Date;createdByUserId:string;result:Awaited<ReturnType<AnalyticsPublicationService['outcome']>>};
const outcomeFields=`id,publication_id AS "publicationId",created_at AS "createdAt",retain_until AS "retainUntil",created_by_user_id AS "createdByUserId",evidence->'result' AS result`;
