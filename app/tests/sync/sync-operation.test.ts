import { recoverInterruptedOperations, transitionOperation, type SyncOperation } from '@/domain/sync/sync-operation';

const pending: SyncOperation = { attempts: 0, body: {}, businessId: 'business', createdAt: '2026-09-30T00:00:00.000Z', id: 'operation', method: 'POST', path: '/sales', status: 'pending', type: 'sale.create', updatedAt: '2026-09-30T00:00:00.000Z', userId: 'user' };

describe('offline synchronization state machine', () => {
  it('recovers a central confirmation after five attempts without counting another send', () => {
    const recovered=transitionOperation({...pending,attempts:5},'recover',{centralReference:'central-id'});
    expect(recovered).toMatchObject({status:'confirmed',attempts:5,centralReference:'central-id'});
  });

  it('prevents a sixth send and a recovery without central evidence', () => {
    expect(()=>transitionOperation({...pending,attempts:5},'start')).toThrow('límite de cinco');
    expect(()=>transitionOperation(pending,'recover')).toThrow('referencia central');
  });
  it('increments attempts and returns a lost response to pending', () => {
    const syncing = transitionOperation(pending, 'start');
    expect(syncing.attempts).toBe(1);
    expect(transitionOperation(syncing, 'network-failure').status).toBe('pending');
  });

  it('preserves the central reference after confirmation', () => {
    const confirmed = transitionOperation(transitionOperation(pending, 'start'), 'confirm', { centralReference: 'central-id' });
    expect(confirmed).toMatchObject({ centralReference: 'central-id', status: 'confirmed' });
  });

  it('sends version conflicts to review instead of overwriting', () => {
    const review = transitionOperation(transitionOperation(pending, 'start'), 'conflict', { message: 'La versión cambió.' });
    expect(review).toMatchObject({ message: 'La versión cambió.', status: 'review' });
  });

  it('rejects invalid transitions', () => {
    expect(() => transitionOperation(pending, 'confirm')).toThrow('La operación no está sincronizando.');
  });

  it('closes a rejected operation after a reasoned local discard', () => {
    const rejected = transitionOperation(transitionOperation(pending, 'start'), 'reject', { message: 'No autorizado.' });
    expect(transitionOperation(rejected, 'discard', { message: 'Descartada localmente: reemplazo revocado.' })).toMatchObject({
      message: 'Descartada localmente: reemplazo revocado.',
      status: 'discarded',
    });
  });
});

it('recovers an interrupted send without changing its identity, body or attempts', () => {
  const interrupted = {...pending, status: 'syncing' as const, attempts: 3};
  const [recovered] = recoverInterruptedOperations([interrupted]);
  expect(recovered).toMatchObject({id: pending.id, body: pending.body, attempts: 3, status: 'pending'});
  expect(interrupted.status).toBe('syncing');
});
it('preserves terminal and review states during restart recovery', () => {
  for (const status of ['confirmed', 'discarded', 'rejected', 'review'] as const) {
    const operation = {...pending, status};
    expect(recoverInterruptedOperations([operation])[0]).toEqual(operation);
  }
});
