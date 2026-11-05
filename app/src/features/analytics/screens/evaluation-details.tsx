import { formatLimaDateTime, formatLimaDate } from '@/domain/shared/date';
import { Text } from 'react-native';
import type { AnalyticsEvaluation } from '@/domain/analytics/analytics';
import { AppCard, FeedbackState } from '@/ui/components';
import { color, typography } from '@/ui/tokens';
import { PublicationReview } from './publication-review';
export function EvaluationDetails({ evaluation,token,onPublished }: { evaluation: AnalyticsEvaluation;token?:string;onPublished?:()=>void }) {
  const text = { color: color.textPrimary, ...typography.bodySmall };
  return <>
      <FeedbackState title="Evaluación conservada" message="Esta evidencia corresponde al corte indicado. Una estimación publicada conserva su propia versión y revisión." tone="neutral" />
      <Text style={text}>Versión {evaluation.id} · {evaluation.algorithmVersion}</Text>
      <Text style={text}>Corte {evaluation.asOf} · {evaluation.window.from} – {evaluation.window.to}</Text>
      <Text style={text}>MAE del modelo: S/ {evaluation.maeSolesPerKg} por kg · Referencia: S/ {evaluation.baselineMaeSolesPerKg} por kg</Text>
      <Text style={text}>Mejora mínima del 10 %: {evaluation.improvementMet ? 'Cumple' : 'No cumple'} · Cobertura: {evaluation.coveredWeeks}/8 ({evaluation.observedCoveragePercent} %) · {evaluation.coverageMet ? 'Cumple mínimo 7/8' : 'No cumple mínimo 7/8'}</Text>
      <Text style={text}>Generada {formatLimaDateTime(evaluation.createdAt)} · Conservación hasta {formatLimaDate(evaluation.retainUntil)}</Text>
      <Text style={text}>El rango empírico tiene cobertura objetivo del 80 %; esta muestra no es una garantía estadística.</Text>
      {evaluation.comparisons.map(item => <AppCard key={item.weekStart} title={`Semana ${item.weekStart}`} description={`Entrenamiento hasta la semana ${item.trainingThrough}`}>
        <Text style={text}>Real S/ {item.actualSolesPerKg} · Estimado histórico S/ {item.priceSolesPerKg} · Referencia S/ {item.baselineSolesPerKg} por kg</Text>
        <Text style={text}>Rango S/ {item.lowerSolesPerKg} – {item.upperSolesPerKg} por kg · {item.covered ? 'Real dentro del rango' : 'Real fuera del rango'}</Text>
        <Text style={text}>Error absoluto S/ {item.absoluteErrorSolesPerKg} por kg</Text>
      </AppCard>)}
      {token?<PublicationReview key={`${token}:${evaluation.id}`} token={token} evaluation={evaluation} onPublished={onPublished}/>:null}
</>;
}
