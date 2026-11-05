import { clearInitialPurchaseDraft, readInitialPurchaseDraft, rememberInitialPurchaseDraft } from '@/domain/reception/initial-purchase-draft';
const draft = { details: { date: '2026-10-11', driverName: 'QA', expectedVarieties: 'Papa', providerName: 'Proveedor', providerPhone: '123', vehiclePlate: 'ABC-123' }, providerId: 'provider', vehicleId: 'vehicle', expectedVarietyIds: ['variety'] };
beforeEach(() => { clearInitialPurchaseDraft(); });
it('isolates session owners and refuses an empty owner', () => {
  rememberInitialPurchaseDraft('a', draft);
  expect(readInitialPurchaseDraft('b')).toBeNull();
  expect(readInitialPurchaseDraft('')).toBeNull();
  rememberInitialPurchaseDraft('b', draft);
  expect(readInitialPurchaseDraft('a')).toBeNull();
});
it('copies both write and read values so callers cannot mutate the retained editing data', () => {
  const input = { ...draft, details: { ...draft.details }, expectedVarietyIds: [...draft.expectedVarietyIds] };
  rememberInitialPurchaseDraft('a', input);
  input.details.driverName = 'Changed'; input.expectedVarietyIds.push('other');
  const result = readInitialPurchaseDraft('a')!;
  expect(result.details.driverName).toBe('QA'); expect(result.expectedVarietyIds).toEqual(['variety']);
  result.details.driverName = 'Changed read'; result.expectedVarietyIds.length = 0;
  expect(readInitialPurchaseDraft('a')?.details.driverName).toBe('QA');
  expect(readInitialPurchaseDraft('a')?.expectedVarietyIds).toEqual(['variety']);
});
it('clears the intended session without clearing another current owner', () => {
  rememberInitialPurchaseDraft('b', draft);
  clearInitialPurchaseDraft('a'); expect(readInitialPurchaseDraft('b')).not.toBeNull();
  clearInitialPurchaseDraft('b'); expect(readInitialPurchaseDraft('b')).toBeNull();
});
