import {StyleSheet,View} from 'react-native';
import {AppButton} from '@/ui/components';
import {spacing} from '@/ui/tokens';
import type {CatalogKind} from '@/services/api/catalog-api';
const names:Record<CatalogKind,string>={providers:'proveedores',buyers:'compradores',varieties:'variedades',qualities:'calidades',origins:'procedencias'};
export function OperationReferenceActions({kinds,onManage,disabled}:{kinds:readonly CatalogKind[];onManage?:(kind:CatalogKind)=>void;disabled?:boolean}){
  return onManage?<View style={styles.actions}>{kinds.map(kind=><AppButton key={kind} disabled={disabled} label={`Registrar o editar ${names[kind]}`} tone="secondary" onPress={()=>onManage(kind)}/>)}</View>:null;
}
const styles=StyleSheet.create({actions:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm}});
