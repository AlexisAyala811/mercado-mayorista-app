import { formatLimaDateTime, formatLimaDate } from '@/domain/shared/date';
import { Text } from 'react-native';
import type { PredictionPublication } from '@/domain/analytics/analytics';
import { FeedbackState } from '@/ui/components';
import { color,typography } from '@/ui/tokens';
export function PredictionDetails({publication}:{publication:PredictionPublication}){
const text={color:color.textPrimary,...typography.bodySmall};
return <>
      <FeedbackState title="Estimación publicada" message="Esta versión conserva su evidencia y revisión originales. Consultarla no acredita las condiciones actuales para generar otra estimación." tone="success"/>
      <Text style={text}>Versión {publication.id} · {publication.forecast.algorithmVersion} · Semana {publication.forecast.weekStart} – {publication.forecast.weekEnd}</Text>
      <Text style={text}>Evidencia {publication.evaluationId} · Revisión {new Date(publication.reviewedAt).toLocaleString('es-PE',{timeZone:publication.forecast.timeZone})}</Text>
      <Text style={text}>Rango S/ {publication.forecast.lowerSolesPerKg} – {publication.forecast.upperSolesPerKg} por kg · Estimación S/ {publication.forecast.priceSolesPerKg} por kg · Ancho S/ {publication.forecast.widthSolesPerKg} por kg</Text>
      <Text style={text}>Cobertura objetivo {publication.forecast.targetCoveragePercent} % · Observada {publication.forecast.observedCoveragePercent} % en ocho semanas. No es una garantía estadística.</Text>
      <Text style={text}>Variables: {publication.forecast.variables.join(', ')} · Generada {formatLimaDateTime(publication.createdAt)} · Conservación hasta {formatLimaDate(publication.retainUntil)}</Text>
</>;
}
