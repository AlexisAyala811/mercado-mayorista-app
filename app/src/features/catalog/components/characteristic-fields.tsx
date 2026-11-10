import {useState} from 'react';
import {StyleSheet,View} from 'react-native';
import type {CommercialCharacteristic,CommercialInput,CommercialSnapshot} from '@/domain/catalog/commercial-characteristic';
import {ChoiceDialog,SelectionField,type Choice} from '@/ui/components';
import {spacing} from '@/ui/tokens';

export function CharacteristicFields({value,qualities,origins,onChange,disabled,historical,appearance}:{value:CommercialInput;qualities:readonly CommercialCharacteristic[];origins:readonly CommercialCharacteristic[];onChange:(field:'qualityId'|'originId',id:string|null)=>void;disabled?:boolean;historical?:Partial<CommercialSnapshot>;appearance?:'default'|'stitch'}){
  const [dialog,setDialog]=useState<'quality'|'origin'|null>(null);
  function label(kind:'quality'|'origin'){
    const id=value[`${kind}Id`];if(!id)return 'No informada';
    return (id===historical?.[`${kind}Id`]?historical?.[`${kind}Name`]:null)??(kind==='quality'?qualities:origins).find(item=>item.id===id)?.name??'Referencia no disponible';
  }
  const kind=dialog??'quality';const selected=value[`${kind}Id`];
  const choices:Choice[]=[{id:'',label:'No informada'},...(kind==='quality'?qualities:origins).map(item=>{
    const oldName=item.id===historical?.[`${kind}Id`]?historical?.[`${kind}Name`]:null;
    return{id:item.id,label:oldName??item.name,supportingText:oldName&&oldName!==item.name?`Nombre actual del catálogo: ${item.name}. Se conserva la etiqueta original de este saco.`:undefined};
  })];
  if(selected&&!choices.some(item=>item.id===selected)&&selected===historical?.[`${kind}Id`])choices.push({id:selected,label:historical?.[`${kind}Name`]??'Referencia histórica',supportingText:'Opción histórica; no disponible para sacos nuevos.'});
  return <>
    <View style={styles.fields}>
      <View style={styles.field}><SelectionField appearance={appearance} label="Calidad comercial" placeholder="No informada" value={label('quality')} disabled={disabled} onPress={()=>setDialog('quality')}/></View>
      <View style={styles.field}><SelectionField appearance={appearance} label="Procedencia de la papa" placeholder="No informada" value={label('origin')} disabled={disabled} onPress={()=>setDialog('origin')}/></View>
    </View>
    <ChoiceDialog visible={dialog!==null&&!disabled} title={kind==='quality'?'Seleccionar calidad comercial':'Seleccionar procedencia de la papa'} choices={choices} selectedIds={[selected??'']} onClose={()=>setDialog(null)} onSelect={choice=>{if(disabled)return;onChange(`${kind}Id`,choice.id||null);setDialog(null);}}/>
  </>;
}
const styles=StyleSheet.create({fields:{flexDirection:'row',flexWrap:'wrap',gap:spacing.md},field:{flexGrow:1,flexBasis:180}});
