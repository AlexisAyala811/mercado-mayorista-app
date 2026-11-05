export type InitialPurchaseDraft = {
  details: { date: string; driverName: string; expectedVarieties: string; providerName: string; providerPhone: string; vehiclePlate: string };
  providerId: string;
  vehicleId: string;
  expectedVarietyIds: string[];
};
let current: { owner: string; draft: InitialPurchaseDraft } | null = null;
function copy(draft: InitialPurchaseDraft): InitialPurchaseDraft {
  return { details: { ...draft.details }, providerId: draft.providerId, vehicleId: draft.vehicleId, expectedVarietyIds: [...draft.expectedVarietyIds] };
}
export function readInitialPurchaseDraft(owner: string) {
  return owner && current?.owner === owner ? copy(current.draft) : null;
}
export function rememberInitialPurchaseDraft(owner: string, draft: InitialPurchaseDraft) {
  if (owner) current = { owner, draft: copy(draft) };
}
export function clearInitialPurchaseDraft(owner?: string) {
  if (!owner || current?.owner === owner) current = null;
}
