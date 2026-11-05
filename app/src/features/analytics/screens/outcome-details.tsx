import { Text } from 'react-native';
import type { PublicationOutcome } from '@/domain/analytics/analytics';
import { FeedbackState } from '@/ui/components';
import { color,typography } from '@/ui/tokens';

export function OutcomeDetails({result}:{result:PublicationOutcome}){
  const text={color:color.textPrimary,...typography.bodySmall};
  return <>    {result?.state==='week_in_progress'?<FeedbackState title="Semana en curso" message="El periodo todavía no terminó. No se calculó precio real ni error." tone="neutral"/>:null}
    {result?.state==='no_valid_operations'?<FeedbackState title="Sin valor real calculable" message="La semana terminó, pero no hay ventas con peso comercial válido. No se sustituyó el precio por cero." tone="warning"/>:null}
    {result?.state==='compared'?<><Text style={text}>Real S/ {result.actualSolesPerKg} por kg · Error absoluto S/ {result.absoluteErrorSolesPerKg} por kg · {result.covered?'Dentro del rango publicado':'Fuera del rango publicado'}</Text><Text style={text}>{result.operationCount} ventas válidas · {result.weightKg} kg</Text></>:null}
    {result?<Text style={text}>Consulta al {new Date(result.takenAt).toLocaleString('es-PE',{timeZone:result.timeZone})}. Este error corresponde a una publicación, no al MAE del piloto.</Text>:null}</>;
}
