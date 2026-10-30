import { randomUUID } from 'node:crypto';
import { canonicalSha256 } from './evaluation-integrity.js';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import { AuditService } from '../audit/audit.service.js';
import { toPage } from '../common/http/page-query.dto.js';
import type { EvaluationListQueryDto } from './analytics-query.dto.js';
import type { SessionIdentity } from '../identity/application/ports/session-identity-reader.js';
import type { loadHistoricalEvaluationInputs } from './historical-price-snapshots.js';
import { predictionAlgorithm, type evaluateHistoricalSnapshots } from './predictive-engine.js';

export type EvaluationEvidence = { inputs: Awaited<ReturnType<typeof loadHistoricalEvaluationInputs>>; evaluation: ReturnType<typeof evaluateHistoricalSnapshots> };
export type StoredEvaluation = { id: string; varietyId: string; asOf: string; algorithmVersion: string; inputsHash: string;
  createdAt: Date; retainUntil: Date; evidence: EvaluationEvidence };
const projection = `id,variety_id AS "varietyId",as_of::text AS "asOf",algorithm_version AS "algorithmVersion",inputs_hash AS "inputsHash",
  created_at AS "createdAt",retain_until AS "retainUntil",evidence`;

export function evaluationInputsHash(inputs: EvaluationEvidence['inputs']) {
  return canonicalSha256(inputs);
}

@Injectable()
export class EvaluationStore {
  constructor(private readonly dataSource: DataSource, private readonly audit: AuditService) {}

  async list(businessId: string, page: EvaluationListQueryDto) {
    return this.dataSource.transaction('REPEATABLE READ', async manager => {
      const items = await manager.query<Omit<StoredEvaluation,'evidence'>[]>(`SELECT id,variety_id AS "varietyId",as_of::text AS "asOf",
        algorithm_version AS "algorithmVersion",inputs_hash AS "inputsHash",created_at AS "createdAt",retain_until AS "retainUntil"
        FROM analytics_evaluations WHERE business_id=$1 AND variety_id=$2 ORDER BY created_at DESC,id DESC LIMIT $3 OFFSET $4`,[businessId,page.varietyId,page.limit,page.offset]);
      const counts = await manager.query<{total:number}[]>('SELECT COUNT(*)::int AS total FROM analytics_evaluations WHERE business_id=$1 AND variety_id=$2',[businessId,page.varietyId]);
      return toPage(items,counts[0]!.total,page);
    });
  }

  async findRequest(manager: EntityManager, businessId: string, clientOperationId: string) {
    const rows = await manager.query<StoredEvaluation[]>(`SELECT ${projection} FROM analytics_evaluations WHERE business_id=$1 AND client_operation_id=$2`, [businessId, clientOperationId]);
    return rows[0] ?? null;
  }
  async persist(manager: EntityManager, identity: SessionIdentity, clientOperationId: string, evidence: EvaluationEvidence) {
    const { varietyId, businessId } = evidence.inputs.final;
    if (businessId !== identity.businessId) throw new ConflictException('Las entradas no pertenecen al negocio actual.');
    const requestDate = evidence.inputs.asOf;
    const previous = await this.findRequest(manager, identity.businessId, clientOperationId);
    if (previous) {
      if (previous.varietyId !== varietyId || previous.asOf !== requestDate) throw new ConflictException('La petición ya corresponde a otra evaluación.');
      return previous;
    }
    const inputsHash = evaluationInputsHash(evidence.inputs);
    const rows = await manager.query<StoredEvaluation[]>(`INSERT INTO analytics_evaluations
      (id,business_id,variety_id,client_operation_id,as_of,algorithm_version,inputs_hash,evidence,created_by_user_id)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9) RETURNING ${projection}`,
      [randomUUID(),identity.businessId,varietyId,clientOperationId,requestDate,predictionAlgorithm,inputsHash,JSON.stringify(evidence),identity.userId]);
    const stored = rows[0]!;
    await this.audit.record(manager,{businessId:identity.businessId,actorUserId:identity.userId,action:'analytics.evaluation.created',
      resourceType:'analytics_evaluation',resourceId:stored.id,details:{algorithmVersion:predictionAlgorithm,asOf:requestDate,varietyId,inputsHash}});
    return stored;
  }
  async get(businessId: string, id: string) {
    const rows = await this.dataSource.query<StoredEvaluation[]>(`SELECT ${projection} FROM analytics_evaluations WHERE business_id=$1 AND id=$2`,[businessId,id]);
    if (!rows[0]) throw new NotFoundException('Evaluación no disponible.');
    return rows[0];
  }
}
