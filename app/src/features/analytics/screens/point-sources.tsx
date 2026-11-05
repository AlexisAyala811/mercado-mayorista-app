import {useState} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import type {AnalyticsPoint} from '@/domain/analytics/analytics';
import {AppButton} from '@/ui/components';
import {color,spacing,typography} from '@/ui/tokens';

export function PointSources({point}:{point:AnalyticsPoint}) {
  const [expanded,setExpanded]=useState(false);
  const context=`${point.operationType==='purchase'?'compras':'ventas'} de ${point.varietyName}, semana ${point.weekStart}`;
  return <View style={styles.section}>
    <AppButton label={expanded?'Ocultar referencias':'Ver referencias del análisis'}
      accessibilityLabel={`${expanded?'Ocultar':'Ver'} referencias de ${context}`}
      accessibilityState={{expanded}} tone="secondary" onPress={()=>setExpanded(value=>!value)}/>
    {expanded?<>
      <Text style={styles.meta}>Referencias centrales utilizadas para este resultado. Las devoluciones son compensaciones, no operaciones nuevas.</Text>
      <ReferencePage title="Operaciones incluidas" ids={point.operationIds} context={context}/>
      <ReferencePage title="Devoluciones incorporadas" ids={point.compensationIds} context={context}/>
    </>:null}
  </View>;
}

function ReferencePage({title,ids,context}:{title:string;ids:readonly string[];context:string}) {
  const [offset,setOffset]=useState(0);
  const pageSize=20;
  const currentOffset=Math.min(offset,Math.max(0,Math.ceil(ids.length/pageSize)-1)*pageSize);
  const end=Math.min(currentOffset+pageSize,ids.length);
  return <View style={styles.section}>
    <Text accessibilityRole="header" style={styles.title}>{title} ({ids.length})</Text>
    {!ids.length?<Text style={styles.meta}>Sin referencias de este tipo en la respuesta.</Text>:<>
      <Text accessibilityLiveRegion="polite" style={styles.meta}>{currentOffset+1}–{end} de {ids.length}</Text>
      {ids.slice(currentOffset,end).map(id=><Text key={id} selectable style={styles.meta}>{id}</Text>)}
      {ids.length>pageSize?<View style={styles.actions}>
        <AppButton label="Referencias anteriores" accessibilityLabel={`${title}: referencias anteriores de ${context}`} disabled={currentOffset===0} tone="secondary" onPress={()=>setOffset(Math.max(0,currentOffset-pageSize))}/>
        <AppButton label="Referencias siguientes" accessibilityLabel={`${title}: referencias siguientes de ${context}`} disabled={end===ids.length} tone="secondary" onPress={()=>setOffset(currentOffset+pageSize)}/>
      </View>:null}
    </>}
  </View>;
}

const styles=StyleSheet.create({
  section:{gap:spacing.sm},
  title:{color:color.textPrimary,...typography.body,fontWeight:'700'},
  meta:{color:color.textSecondary,...typography.bodySmall},
  actions:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm},
});
