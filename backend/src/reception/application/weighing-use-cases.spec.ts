import { randomUUID } from 'node:crypto';

import type { SessionIdentity } from '../../identity/application/ports/session-identity-reader.js';
import { UserRole } from '../../identity/entities/user.entity.js';
import { ReceptionState } from '../entities/reception.entity.js';
import type {
  NewSack,
  SackOrder,
  StoredSack,
  WeighingAudit,
  WeighingAuditEvent,
  WeighingReception,
  WeighingRepository,
  WeighingUnitOfWork,
} from './weighing-ports.js';
import { WeighingUseCases } from './weighing-use-cases.js';

// Contract tests with an in-memory adapter. They prove the use case rules;
// locking, concurrency and durability are proven on PostgreSQL (e2e).
type Sack = StoredSack & {
  businessId: string;
  clientOperationId: string;
  voidOperationId: string | null;
  voided: boolean;
};
type Reception = WeighingReception & { businessId: string };
type State = {
  receptions: Reception[];
  sacks: Sack[];
  audit: WeighingAuditEvent[];
};

class InMemoryWeighing implements WeighingUnitOfWork<Sack, Reception> {
  failAudit = false;
  constructor(public state: State) {}

  async run<T>(
    work: (ports: {
      repository: WeighingRepository<Sack, Reception>;
      audit: WeighingAudit;
    }) => Promise<T>,
  ) {
    const draft: State = structuredClone(this.state);
    const reception = (id: string) =>
      draft.receptions.find((item) => item.id === id)!;
    const store = (sack: NewSack, fields: Partial<Sack>): Sack => ({
      businessId: sack.businessId,
      clientOperationId: sack.clientOperationId,
      correctedFromSackId: null,
      correctionReason: null,
      grossWeightKg: sack.weight.gross,
      id: randomUUID(),
      netWeightKg: sack.weight.net,
      originId: sack.originId ?? null,
      qualityId: sack.qualityId ?? null,
      receptionId: sack.receptionId,
      sequence: 0,
      tareKg: sack.weight.tare,
      varietyId: sack.varietyId,
      voidOperationId: null,
      voided: false,
      ...fields,
    });
    const repository: WeighingRepository<Sack, Reception> = {
      lockOperation: async () => undefined,
      findSackByOperation: async (businessId, clientOperationId) =>
        draft.sacks.find(
          (sack) =>
            sack.businessId === businessId &&
            sack.clientOperationId === clientOperationId,
        ) ?? null,
      findSackByVoidOperation: async (businessId, voidOperationId) =>
        draft.sacks.find(
          (sack) =>
            sack.businessId === businessId &&
            sack.voidOperationId === voidOperationId,
        ) ?? null,
      lockReception: async (businessId, receptionId) =>
        draft.receptions.find(
          (item) => item.id === receptionId && item.businessId === businessId,
        ) ?? null,
      findActiveSack: async (businessId, receptionId, sackId) =>
        draft.sacks.find(
          (sack) =>
            sack.businessId === businessId &&
            sack.receptionId === receptionId &&
            sack.id === sackId &&
            !sack.voided,
        ) ?? null,
      activeSacks: async (businessId, receptionId) =>
        draft.sacks.filter(
          (sack) =>
            sack.businessId === businessId &&
            sack.receptionId === receptionId &&
            !sack.voided,
        ),
      nextSequence: async (receptionId) =>
        draft.sacks.filter((sack) => sack.receptionId === receptionId).length +
        1,
      addSack: async (sack) => {
        const stored = store(sack, { sequence: sack.sequence });
        draft.sacks.push(stored);
        return stored;
      },
      replaceSack: async (original, replacement) => {
        const stored = draft.sacks.find((sack) => sack.id === original.id)!;
        if (replacement.correctionReason !== null)
          stored.correctionReason = replacement.correctionReason;
        stored.voided = true;
        const corrected = store(replacement, {
          correctedFromSackId: stored.id,
          correctionReason: replacement.correctionReason,
          originId:
            replacement.originId === undefined
              ? stored.originId
              : replacement.originId,
          qualityId:
            replacement.qualityId === undefined
              ? stored.qualityId
              : replacement.qualityId,
          sequence: stored.sequence,
        });
        draft.sacks.push(corrected);
        return corrected;
      },
      voidSack: async (sack, reason, voidOperationId) => {
        const stored = draft.sacks.find((item) => item.id === sack.id)!;
        Object.assign(stored, {
          correctionReason: reason,
          voidOperationId,
          voided: true,
        });
        return stored;
      },
      markWeighing: async (locked) => {
        Object.assign(reception(locked.id), {
          state: ReceptionState.Weighing,
          version: reception(locked.id).version + 1,
        });
      },
      bumpVersion: async (locked) => (reception(locked.id).version += 1),
      closeReception: async (locked, closeOperationId) =>
        Object.assign(reception(locked.id), {
          closeOperationId,
          state: ReceptionState.Weighed,
          version: reception(locked.id).version + 1,
        }),
      storedReception: (locked) => reception(locked.id),
    };
    const audit: WeighingAudit = {
      record: async (event) => {
        if (this.failAudit) throw new Error('audit unavailable');
        draft.audit.push(event);
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
      {
        businessId: 'business',
        closeOperationId: null,
        id: 'reception',
        state,
        varietyIds: ['canchan'],
        version: 0,
      },
    ],
    sacks: [],
  });
  return { store, weighing: new WeighingUseCases(store) };
}

const order = (overrides: Partial<SackOrder> = {}): SackOrder => ({
  clientOperationId: randomUUID(),
  expectedReceptionVersion: 0,
  grossWeightKg: '52.5',
  tareKg: '0.5',
  varietyId: 'canchan',
  ...overrides,
});
const version = (store: InMemoryWeighing) => store.state.receptions[0]!.version;
const actions = (store: InMemoryWeighing) =>
  store.state.audit.map((event) => event.action);

describe('RegisterSackWeight', () => {
  it('registers the net weight, moves the reception to weighing and audits it', async () => {
    const { store, weighing } = setup();
    const sack = await weighing.register.execute(
      identity,
      'reception',
      order(),
    );
    expect(sack).toMatchObject({
      grossWeightKg: '52.500',
      netWeightKg: '52.000',
      sequence: 1,
      tareKg: '0.500',
    });
    expect(store.state.receptions[0]).toMatchObject({
      state: ReceptionState.Weighing,
      version: 1,
    });
    expect(store.state.audit).toEqual([
      expect.objectContaining({
        action: 'reception.sack-added',
        details: { sequence: 1 },
        resourceId: sack.id,
      }),
    ]);
  });

  it('answers five resends of the same order with one sack and one audit event', async () => {
    const { store, weighing } = setup();
    const first = order();
    const sack = await weighing.register.execute(identity, 'reception', first);
    for (let attempt = 0; attempt < 4; attempt += 1)
      expect(
        await weighing.register.execute(identity, 'reception', {
          ...first,
          grossWeightKg: '52.500',
          tareKg: '0.500',
        }),
      ).toEqual(sack);
    expect(store.state.sacks).toHaveLength(1);
    expect(store.state.audit).toHaveLength(1);
  });

  it('rejects the same order id with another weight as operation-id-conflict', async () => {
    const { weighing } = setup();
    const first = order();
    await weighing.register.execute(identity, 'reception', first);
    await expect(
      weighing.register.execute(identity, 'reception', {
        ...first,
        grossWeightKg: '60',
      }),
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
    const { store, weighing } = setup();
    await expect(
      weighing.register.execute(identity, 'reception', invalid),
    ).rejects.toMatchObject({ status });
    expect(store.state.sacks).toEqual([]);
    expect(store.state.audit).toEqual([]);
    expect(version(store)).toBe(0);
  });

  it('rejects new sacks once the weighing is closed', async () => {
    const { store, weighing } = setup(ReceptionState.Weighed);
    await expect(
      weighing.register.execute(identity, 'reception', order()),
    ).rejects.toMatchObject({ status: 409 });
    expect(store.state.sacks).toEqual([]);
  });

  it('answers 404 for a reception that does not exist', async () => {
    const { weighing } = setup();
    await expect(
      weighing.register.execute(identity, 'other', order()),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('keeps nothing when the audit event cannot be recorded', async () => {
    const { store, weighing } = setup();
    store.failAudit = true;
    await expect(
      weighing.register.execute(identity, 'reception', order()),
    ).rejects.toThrow('audit unavailable');
    expect(store.state.sacks).toEqual([]);
    expect(version(store)).toBe(0);
  });
});

describe('corrections, withdrawal and closing', () => {
  async function weighed(sacks = 2) {
    const context = setup();
    const added = [];
    for (let index = 0; index < sacks; index += 1)
      added.push(
        await context.weighing.register.execute(
          identity,
          'reception',
          order({ expectedReceptionVersion: index }),
        ),
      );
    return { ...context, added };
  }

  it('corrects an open sack keeping its sequence and retiring the original', async () => {
    const { store, weighing, added } = await weighed(1);
    const correction = order({
      expectedReceptionVersion: 1,
      grossWeightKg: '50',
    });
    const corrected = await weighing.correct.execute(
      identity,
      'reception',
      added[0]!.id,
      correction,
    );
    expect(corrected).toMatchObject({
      correctedFromSackId: added[0]!.id,
      correctionReason: null,
      netWeightKg: '49.500',
      sequence: 1,
    });
    expect(
      await weighing.correct.execute(
        identity,
        'reception',
        added[0]!.id,
        correction,
      ),
    ).toEqual(corrected);
    expect(store.state.sacks.filter((sack) => !sack.voided)).toEqual([
      corrected,
    ]);
    expect(version(store)).toBe(2);
    expect(actions(store)).toEqual([
      'reception.sack-added',
      'reception.sack-corrected',
    ]);
  });

  it('withdraws a sack with its reason and answers its resend with the same sack', async () => {
    const { store, weighing, added } = await weighed(2);
    const withdrawal = {
      clientOperationId: randomUUID(),
      expectedReceptionVersion: 2,
      reason: 'Saco duplicado',
    };
    const voided = await weighing.void.execute(
      identity,
      'reception',
      added[1]!.id,
      withdrawal,
    );
    expect(voided).toMatchObject({
      correctionReason: 'Saco duplicado',
      sequence: 2,
    });
    expect(
      await weighing.void.execute(
        identity,
        'reception',
        added[1]!.id,
        withdrawal,
      ),
    ).toEqual(voided);
    await expect(
      weighing.void.execute(identity, 'reception', added[0]!.id, withdrawal),
    ).rejects.toMatchObject({ response: { code: 'operation-id-conflict' } });
    expect(store.state.audit.at(-1)).toMatchObject({
      action: 'reception.sack-voided',
      details: { reason: 'Saco duplicado', sequence: 2 },
    });
    expect(version(store)).toBe(3);
  });

  it('closes the weighing with the totals of the active sacks only once', async () => {
    const { store, weighing, added } = await weighed(2);
    await weighing.void.execute(identity, 'reception', added[1]!.id, {
      clientOperationId: randomUUID(),
      expectedReceptionVersion: 2,
      reason: 'Saco duplicado',
    });
    const close = {
      clientOperationId: randomUUID(),
      expectedReceptionVersion: 3,
    };
    const closed = await weighing.close.execute(identity, 'reception', close);
    expect(closed).toMatchObject({ state: ReceptionState.Weighed, version: 4 });
    expect(await weighing.close.execute(identity, 'reception', close)).toEqual(
      closed,
    );
    expect(store.state.audit.at(-1)).toMatchObject({
      action: 'reception.weighing-closed',
      details: { sackCount: 1, totalWeightKg: '52.000', varietyCount: 1 },
      resourceType: 'reception',
    });
    expect(
      actions(store).filter((action) => action.endsWith('closed')),
    ).toHaveLength(1);
  });

  it('refuses to close a weighing without active sacks', async () => {
    const { store, weighing } = setup(ReceptionState.Weighing);
    await expect(
      weighing.close.execute(identity, 'reception', {
        clientOperationId: randomUUID(),
        expectedReceptionVersion: 0,
      }),
    ).rejects.toMatchObject({ status: 422 });
    expect(store.state.receptions[0]!.state).toBe(ReceptionState.Weighing);
  });

  it('corrects a closed sack with its reason before settlement, and only then', async () => {
    const { store, weighing, added } = await weighed(1);
    const reason = 'Tara mal registrada';
    await expect(
      weighing.correctClosed.execute(identity, 'reception', added[0]!.id, {
        ...order({ expectedReceptionVersion: 1 }),
        reason,
      }),
    ).rejects.toMatchObject({ status: 409 });

    await weighing.close.execute(identity, 'reception', {
      clientOperationId: randomUUID(),
      expectedReceptionVersion: 1,
    });
    const corrected = await weighing.correctClosed.execute(
      identity,
      'reception',
      added[0]!.id,
      { ...order({ expectedReceptionVersion: 2, tareKg: '1' }), reason },
    );
    expect(corrected).toMatchObject({
      correctionReason: reason,
      netWeightKg: '51.500',
      sequence: 1,
    });
    expect(
      store.state.sacks.find((sack) => sack.id === added[0]!.id),
    ).toMatchObject({
      correctionReason: reason,
      voided: true,
    });
    expect(store.state.audit.at(-1)).toMatchObject({
      action: 'reception.closed-sack-corrected',
      details: {
        correctedFromSackId: added[0]!.id,
        reason,
        receptionVersion: 3,
      },
    });
  });

  it('answers an outdated closed correction with the closed-weighing version message', async () => {
    const { weighing, added } = await weighed(1);
    await weighing.close.execute(identity, 'reception', {
      clientOperationId: randomUUID(),
      expectedReceptionVersion: 1,
    });
    await expect(
      weighing.correctClosed.execute(identity, 'reception', added[0]!.id, {
        ...order({ expectedReceptionVersion: 1 }),
        reason: 'Tara mal registrada',
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'reception-version-conflict',
        message: 'La recepción cambió.',
      },
    });
  });

  it('answers 404 for a sack that was already withdrawn', async () => {
    const { weighing, added } = await weighed(1);
    await weighing.void.execute(identity, 'reception', added[0]!.id, {
      clientOperationId: randomUUID(),
      expectedReceptionVersion: 1,
      reason: 'Saco duplicado',
    });
    await expect(
      weighing.correct.execute(
        identity,
        'reception',
        added[0]!.id,
        order({ expectedReceptionVersion: 2 }),
      ),
    ).rejects.toMatchObject({ status: 404 });
  });
});
