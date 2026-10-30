import { DataSource, type EntityManager } from 'typeorm';
import { AnalyticsEvaluationService } from './analytics-evaluation.service.js';
import { EvaluationStore, type EvaluationEvidence, type StoredEvaluation } from './evaluation-store.js';
import { UserRole } from '../identity/entities/user.entity.js';
import type { SessionIdentity } from '../identity/application/ports/session-identity-reader.js';

const identity: SessionIdentity = { businessId:'b',businessName:'Negocio',role:UserRole.Wholesaler,userId:'u',sessionId:'s',username:'Mayorista',expiresAt:new Date('2030-01-01') };
const input={varietyId:'v',asOf:'2026-10-12',clientOperationId:'operation'};
function setup() {
  const query=vi.fn(async (sql: string, parameters: unknown[]) => {
    if (sql.startsWith('SELECT id FROM potato_varieties')) return [{id:'v'}];
    const rows=[];
    for(let time=Date.parse(String(parameters[2]));time<=Date.parse(String(parameters[3]));time+=7*86400000) {
      const weekStart=new Date(time).toISOString().slice(0,10);
      const index=(time-Date.parse('2026-04-13'))/(7*86400000);
      for(let sale=0;sale<5;sale++) rows.push({operationType:'sale',operationId:`${weekStart}-${sale}`,varietyId:'v',varietyName:'Variedad',weekStart,sacks:1,weightKg:'10.000',merchandiseCents:index%2?'4000':'2000',compensationIds:[]});
    }
    return rows;
  });
  const manager={query} as unknown as EntityManager;
  const transaction=vi.fn(async (_isolation: string, work:(manager:EntityManager)=>Promise<StoredEvaluation>)=>work(manager));
  const findRequest=vi.fn().mockResolvedValue(null);
  const persist=vi.fn(async (_manager:EntityManager,_identity:SessionIdentity,_id:string,evidence:EvaluationEvidence):Promise<StoredEvaluation>=>({id:'saved',varietyId:'v',asOf:input.asOf,algorithmVersion:'weekly-mean-4-v1',inputsHash:'hash',createdAt:new Date(),retainUntil:new Date('2031-10-12'),evidence}));
  const store={findRequest,persist} as unknown as EvaluationStore;
  return {service:new AnalyticsEvaluationService({transaction} as unknown as DataSource,store),transaction,query,findRequest,persist};
}
beforeEach(()=>{vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-12T14:00:00Z'));});
afterEach(()=>vi.useRealTimers());

it('reconstructs and saves using the transaction manager and returns historical evidence without future publication',async()=>{
  const s=setup();const result=await s.service.create(identity,input);
  expect(s.transaction.mock.calls[0]![0]).toBe('REPEATABLE READ');
  expect(s.query).toHaveBeenCalledTimes(18);
  expect(s.persist).toHaveBeenCalledTimes(1);
  expect(result.comparisons).toHaveLength(8);
  expect(result.publicationAvailable).toBe(false);
  expect(result).not.toHaveProperty('inputs');
});
it('recovers the original request before reading source data and rejects changed filters',async()=>{
  const s=setup();await s.service.create(identity,input);
  const saved=s.persist.mock.results[0]!.value; s.findRequest.mockResolvedValue(await saved);s.query.mockClear();
  expect((await s.service.create(identity,input)).id).toBe('saved');
  expect(s.query).not.toHaveBeenCalled();
  await expect(s.service.create(identity,{...input,varietyId:'other'})).rejects.toThrow('otra evaluación');
});
it('retries transient serialization with the same request and bounds exhausted retries',async()=>{
  const s=setup();s.transaction.mockRejectedValueOnce({driverError:{code:'40001'}});
  expect((await s.service.create(identity,input)).id).toBe('saved');
  expect(s.transaction).toHaveBeenCalledTimes(2);
  expect(s.persist.mock.calls[0]![2]).toBe(input.clientOperationId);
  const failed=setup();failed.transaction.mockRejectedValue({code:'40001'});
  await expect(failed.service.create(identity,input)).rejects.toThrow('misma petición');
  expect(failed.transaction).toHaveBeenCalledTimes(3);
});
it('rejects an assistant, a future cutoff and insufficient history without storing',async()=>{
  const s=setup();
  await expect(s.service.create({...identity,role:UserRole.Assistant},input)).rejects.toThrow('Mayorista');
  await expect(s.service.create(identity,{...input,asOf:'2026-10-13'})).rejects.toThrow('futura');
  expect(s.transaction).not.toHaveBeenCalled();
  s.query.mockResolvedValue([]);
  await expect(s.service.create(identity,input)).rejects.toThrow('Variedad no disponible');
  const empty=setup();empty.query.mockImplementation(async sql=>sql.startsWith('SELECT id FROM')?[{id:'v'}]:[]);
  await expect(empty.service.create(identity,input)).rejects.toThrow('No hay valor real');
  expect(empty.persist).not.toHaveBeenCalled();
});
it('does not hide unrelated database constraint failures behind retry',async()=>{
  const s=setup();const failure={code:'23505',constraint:'unrelated_constraint'};
  s.transaction.mockRejectedValue(failure);
  await expect(s.service.create(identity,input)).rejects.toBe(failure);
  expect(s.transaction).toHaveBeenCalledTimes(1);
});
