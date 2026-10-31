import { randomUUID } from 'node:crypto';

import type { SessionIdentity } from '../../identity/application/ports/session-identity-reader.js';
import { UserRole } from '../../identity/entities/user.entity.js';
import { ReceptionState } from '../entities/reception.entity.js';
import {
  RegisterSackWeight,
  type NewSack,
  type SackOrder,
  type StoredSack,
  type WeighingAudit,
  type WeighingReception,
  type WeighingRepository,
  type WeighingUnitOfWork,
} from './register-sack-weight.js';

// Contract tests with an in-memory adapter. They prove the use case rules;
// locking, concurrency and durability are proven on PostgreSQL (e2e).
type Sack = StoredSack & { businessId: string; clientOperationId: string };
type State = {
  receptions: WeighingReception[];
  sacks: Sack[];
  audit: Array<{ sackId: string; sequence: number }>;
};

class InMemoryWeighing implements WeighingUnitOfWork<Sack> {
  failAudit = false;
  constructor(public state: State) {}

  async run<T>(
    work: (ports: {
      repository: WeighingRepository<Sack>;
      audit: WeighingAudit;
    }) => Promise<T>,
  ) {
    const draft: State = structuredClone(this.state);
    const repository: WeighingRepository<Sack> = {
      lockOperation: async () => undefined,
      findSackByOperation: async (businessId, clientOperationId) =>
        draft.sacks.find(
          (sack) =>
            sack.businessId === businessId &&
            sack.clientOperationId === clientOperationId,
        ) ?? null,
      lockReception: async (_businessId, receptionId) =>
        draft.receptions.find((reception) => reception.id === receptionId) ??
        null,
      nextSequence: async (receptionId) =>
        draft.sacks.filter((sack) => sack.receptionId === receptionId).length +
        1,
      addSack: async (sack: NewSack) => {
        const stored: Sack = {
          businessId: sack.businessId,
          clientOperationId: sack.clientOperationId,
          correctedFromSackId: null,
          grossWeightKg: sack.weight.gross,
          id: randomUUID(),
          originId: sack.originId ?? null,
          qualityId: sack.qualityId ?? null,
          receptionId: sack.receptionId,
          sequence: sack.sequence,
          tareKg: sack.weight.tare,
          varietyId: sack.varietyId,
        };
        draft.sacks.push(stored);
        return stored;
      },
      markWeighing: async (reception) => {
        const stored = draft.receptions.find(
          (item) => item.id === reception.id,
        )!;
        stored.state = ReceptionState.Weighing;
        stored.version += 1;
      },
    };
    const audit: WeighingAudit = {
      sackAdded: async (event) => {
        if (this.failAudit) throw new Error('audit unavailable');
        draft.audit.push({ sackId: event.sackId, sequence: event.sequence });
      },
    };
    const result = await work({ audit, repository });
    this.state = draft; // committed only when the whole work succeeded
    return result;
  }
}

const identity: SessionIdentity = {
  businessId: 'business',
  businessName: 'Mercado',
  expiresAt: new Date('2030-01-01'),
  role: UserRole.Wholesaler,
  sessionId: 'session',
  userId: 'user',
  username: 'Mayorista',
};

function setup(state = ReceptionState.Draft) {
  const store = new InMemoryWeighing({
    audit: [],
    receptions: [
      { id: 'reception', state, varietyIds: ['canchan'], version: 0 },
    ],
    sacks: [],
  });
  return { store, useCase: new RegisterSackWeight(store) };
}

const order = (overrides: Partial<SackOrder> = {}): SackOrder => ({
  clientOperationId: 'order-1',
  expectedReceptionVersion: 0,
  grossWeightKg: '52.5',
  tareKg: '0.5',
  varietyId: 'canchan',
  ...overrides,
});

describe('RegisterSackWeight', () => {
  it('registers the net weight, moves the reception to weighing and audits it', async () => {
    const { store, useCase } = setup();
    const sack = await useCase.execute(identity, 'reception', order());
    expect(sack).toMatchObject({
      grossWeightKg: '52.500',
      tareKg: '0.500',
      sequence: 1,
    });
    expect(store.state.receptions[0]).toMatchObject({
      state: ReceptionState.Weighing,
      version: 1,
    });
    expect(store.state.audit).toEqual([{ sackId: sack.id, sequence: 1 }]);
  });

  it('answers five resends of the same order with one sack and one audit event', async () => {
    const { store, useCase } = setup();
    const first = await useCase.execute(identity, 'reception', order());
    for (let attempt = 0; attempt < 4; attempt += 1)
      expect(
        await useCase.execute(
          identity,
          'reception',
          order({ grossWeightKg: '52.500', tareKg: '0.500' }),
        ),
      ).toEqual(first);
    expect(store.state.sacks).toHaveLength(1);
    expect(store.state.audit).toHaveLength(1);
  });

  it('rejects the same order id with another weight as operation-id-conflict', async () => {
    const { useCase } = setup();
    await useCase.execute(identity, 'reception', order());
    await expect(
      useCase.execute(identity, 'reception', order({ grossWeightKg: '60' })),
    ).rejects.toMatchObject({
      status: 409,
      response: { code: 'operation-id-conflict' },
    });
  });

  it.each([
    ['a variety outside the reception', order({ varietyId: 'yungay' }), 422],
    ['a tare equal to the gross weight', order({ tareKg: '52.5' }), 422],
    ['more than three decimals', order({ grossWeightKg: '52.5001' }), 422],
    ['an old reception version', order({ expectedReceptionVersion: 3 }), 409],
  ])('rejects %s without writing anything', async (_case, invalid, status) => {
    const { store, useCase } = setup();
    await expect(
      useCase.execute(identity, 'reception', invalid),
    ).rejects.toMatchObject({ status });
    expect(store.state.sacks).toEqual([]);
    expect(store.state.audit).toEqual([]);
    expect(store.state.receptions[0]!.version).toBe(0);
  });

  it('rejects new sacks once the weighing is closed', async () => {
    const { store, useCase } = setup(ReceptionState.Weighed);
    await expect(
      useCase.execute(identity, 'reception', order()),
    ).rejects.toMatchObject({ status: 409 });
    expect(store.state.sacks).toEqual([]);
  });

  it('answers 404 for a reception that does not exist', async () => {
    const { useCase } = setup();
    await expect(
      useCase.execute(identity, 'other', order()),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('keeps nothing when the audit event cannot be recorded', async () => {
    const { store, useCase } = setup();
    store.failAudit = true;
    await expect(
      useCase.execute(identity, 'reception', order()),
    ).rejects.toThrow('audit unavailable');
    expect(store.state.sacks).toEqual([]);
    expect(store.state.receptions[0]!.version).toBe(0);
  });
});
