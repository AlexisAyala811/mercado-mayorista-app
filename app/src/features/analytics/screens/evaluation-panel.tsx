import { useEffect, useRef, useState } from 'react';

import type { AnalyticsEvaluation } from '@/domain/analytics/analytics';
import { createOperationId } from '@/domain/reception/reception';
import { useSession } from '@/features/auth/session/session-provider';
import { ApiError } from '@/services/api/api-client';
import { createAnalyticsEvaluation } from '@/services/api/analytics-api';
import { AppButton, AppCard, FeedbackState, LoadingState } from '@/ui/components';
import { EvaluationDetails } from './evaluation-details';

export function EvaluationPanel({ token, varietyId, asOf, onSaved,onPublished }: { token: string; varietyId: string; asOf: string; onSaved?: () => void;onPublished?:()=>void }) {
  const { invalidateSession } = useSession();
  const active = useRef(true); const operationId = useRef<string | null>(null); const inFlight = useRef(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<AnalyticsEvaluation | null>(null);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  async function evaluate() {
    if (inFlight.current) return;
    inFlight.current = true; operationId.current ??= createOperationId(); setBusy(true); setError(null);
    try {
      const saved = await createAnalyticsEvaluation(token, { varietyId, asOf, clientOperationId: operationId.current });
      if (active.current) { setEvaluation(saved); onSaved?.(); }
    } catch (cause) {
      if (!active.current) return;
      if (cause instanceof ApiError && cause.status === 401) void invalidateSession();
      else setError(cause instanceof ApiError ? cause.message : 'No se pudo conservar la evaluación. Reintenta: se usará la misma petición para recuperar la versión si ya se guardó.');
    } finally { inFlight.current = false; if (active.current) setBusy(false); }
  }

  return <AppCard title="Evaluación histórica" description="Contrasta ocho semanas con datos anteriores a cada una y conserva la evidencia. No publica un precio futuro.">
    <AppButton disabled={busy} label={busy ? 'Evaluando…' : evaluation ? 'Crear otra evaluación' : 'Evaluar y conservar evidencia'} onPress={() => { if (inFlight.current) return; if (evaluation) { operationId.current = null; setEvaluation(null); } void evaluate(); }} />
    {busy ? <LoadingState label="Reconstruyendo y conservando la evaluación" /> : null}
    {error ? <FeedbackState title="No se pudo conservar la evaluación" message={error} tone="error" actionLabel="Reintentar evaluación" onAction={() => void evaluate()} /> : null}
    {evaluation ? <EvaluationDetails token={token} evaluation={evaluation} onPublished={onPublished}/> : null}
  </AppCard>;
}
