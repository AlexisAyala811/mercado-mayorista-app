import { ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { SessionIdentity } from '../identity/application/ports/session-identity-reader.js';
import { UserRole } from '../identity/entities/user.entity.js';
import type { CreateAnalyticsEvaluationDto, EvaluationListQueryDto } from './analytics-query.dto.js';
import { EvaluationStore, type StoredEvaluation } from './evaluation-store.js';
import { loadHistoricalEvaluationInputs } from './historical-price-snapshots.js';
import { evaluateHistoricalSnapshots, forecastFromSnapshot } from './predictive-engine.js';
import { PredictionInputError } from './prediction-input-error.js';

function code(cause: unknown): string | null {
  if (!cause || typeof cause !== 'object') return null;
  if ('code' in cause && typeof cause.code === 'string') return cause.code;
  return 'driverError' in cause ? code(cause.driverError) : null;
}
function constraint(cause: unknown): string | null {
  if (!cause || typeof cause !== 'object') return null;
  if ('constraint' in cause && typeof cause.constraint === 'string') return cause.constraint;
  return 'driverError' in cause ? constraint(cause.driverError) : null;
}
function response(stored: StoredEvaluation) {
  return { id: stored.id, varietyId: stored.varietyId, asOf: stored.asOf,
    inputsHash: stored.inputsHash, createdAt: stored.createdAt, retainUntil: stored.retainUntil,
    window: stored.evidence.inputs.window, ...stored.evidence.evaluation };
}
function authorize(identity: SessionIdentity) {
  if (identity.role !== UserRole.Wholesaler) throw new ForbiddenException('Solo el Mayorista puede consultar evaluaciones.');
}
@Injectable()
export class AnalyticsEvaluationService {
  constructor(private readonly dataSource: DataSource, private readonly store: EvaluationStore) {}

  async create(identity: SessionIdentity, input: CreateAnalyticsEvaluationDto) {
    authorize(identity);
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());
    if (input.asOf > today) throw new UnprocessableEntityException('El corte no puede ser una fecha futura.');
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const stored = await this.dataSource.transaction('REPEATABLE READ', async manager => {
          const previous = await this.store.findRequest(manager, identity.businessId, input.clientOperationId);
          if (previous) {
            if (previous.varietyId !== input.varietyId || previous.asOf !== input.asOf) throw new ConflictException('La petición ya corresponde a otra evaluación.');
            return previous;
          }
          const variety = await manager.query<{ id: string }[]>('SELECT id FROM potato_varieties WHERE business_id=$1 AND id=$2',[identity.businessId,input.varietyId]);
          if (!variety.length) throw new NotFoundException('Variedad no disponible.');
          const inputs = await loadHistoricalEvaluationInputs((sql, parameters) => manager.query(sql, parameters), identity.businessId, input.varietyId, input.asOf);
          forecastFromSnapshot(inputs.final.points.map(point => ({ weekStart: point.weekStart, priceSolesPerKg: point.priceSolesPerKg, validSaleCount: point.operationCount, weightKg: point.weightKg })));
          const evaluation = evaluateHistoricalSnapshots(inputs.folds);
          return this.store.persist(manager, identity, input.clientOperationId, { inputs, evaluation });
        });
        return response(stored);
      } catch (cause) {
        if (cause instanceof PredictionInputError) throw new UnprocessableEntityException(cause.message);
        if (code(cause) === '23505' && constraint(cause) !== 'uq_analytics_evaluations_operation') throw cause;
        if (!['40001','40P01','23505'].includes(code(cause) ?? '')) throw cause;
      }
    }
    throw new ServiceUnavailableException('No se pudo conservar la evaluación. Reintenta la misma petición.');
  }
  async get(identity: SessionIdentity, id: string) {
    authorize(identity);
    return response(await this.store.get(identity.businessId, id));
  }
  async list(identity: SessionIdentity, query: EvaluationListQueryDto) {
    authorize(identity);
    return this.store.list(identity.businessId,query);
  }
}
