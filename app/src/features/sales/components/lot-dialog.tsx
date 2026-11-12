import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SheetInput } from '@/features/reception/screens/purchase-sheet';
import { SymbolView } from '@/ui/components/symbol';
import { accent, color } from '@/ui/tokens';

export type LotChoice = { id: string; label: string };
export type NewLot = { varietyId: string; qualityId: string | null; originId: string | null; unitPrice: string; plannedSacks: number };

type Props = {
  visible: boolean;
  varieties: LotChoice[];
  qualities: LotChoice[];
  origins?: LotChoice[];
  // Editing the active lot (the ✎ of the mockup): starts from its values and
  // does not ask for the number of sacks.
  initial?: Omit<NewLot, 'plannedSacks'>;
  onCancel: () => void;
  onCreate: (lot: NewLot) => void;
};

// Sacks the lot starts with: empty cells to type their weights (spec 011,
// CL-ST22). More can be added with «+ Añadir 1 saco».
export const plannedOptions = [5, 10, 20, 30, 50] as const;
const plannedLabel = (count: number) => `${count} sacos${count === 10 ? ' (lote estándar)' : ''}`;

type Open = 'variety' | 'quality' | 'origin' | 'planned' | null;

// «Añadir nuevo lote / variedad» of the Stitch sale mockup: variety, quality,
// price per kilogram and the initial number of sacks.
export function LotDialog({ initial, onCancel, onCreate, origins = [], qualities, varieties, visible }: Props) {
  const editing = Boolean(initial);
  const [varietyId, setVarietyId] = useState<string | null>(initial?.varietyId ?? null);
  const [qualityId, setQualityId] = useState<string | null>(initial?.qualityId ?? null);
  const [originId, setOriginId] = useState<string | null>(initial?.originId ?? null);
  const [unitPrice, setUnitPrice] = useState(initial?.unitPrice ?? '');
  const [planned, setPlanned] = useState<number>(10);
  const [open, setOpen] = useState<Open>(null);
  const variety = varieties.find((item) => item.id === varietyId);
  const quality = qualities.find((item) => item.id === qualityId);
  const origin = origins.find((item) => item.id === originId);

  function reset() {
    setVarietyId(null); setQualityId(null); setOriginId(null); setUnitPrice(''); setPlanned(10); setOpen(null);
  }
  function cancel() { reset(); onCancel(); }
  function create() {
    if (!varietyId) return;
    onCreate({ originId, plannedSacks: planned, qualityId, unitPrice: unitPrice.trim(), varietyId });
    reset();
  }

  return (
    <Modal animationType="fade" onRequestClose={cancel} transparent visible={visible}>
      <View style={styles.backdrop}>
        <View accessibilityViewIsModal style={styles.card}>
          <View style={styles.head}>
            <View style={styles.titleRow}>
              <SymbolView fallback={null} name={{ android: 'add_box', ios: 'plus.square', web: 'add_box' }} size={22} tintColor={accent.emerald.ink} />
              <Text accessibilityRole="header" style={styles.title}>{editing ? 'Editar lote / variedad' : 'Añadir nuevo lote / variedad'}</Text>
            </View>
            <Pressable accessibilityLabel="Cerrar" accessibilityRole="button" hitSlop={8} onPress={cancel} style={styles.close}>
              <SymbolView fallback={null} name={{ android: 'close', ios: 'xmark', web: 'close' }} size={20} tintColor="#475569" />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <Select label="VARIEDAD / NOMBRE" onToggle={() => setOpen(open === 'variety' ? null : 'variety')} open={open === 'variety'} placeholder="Elige la variedad" value={variety?.label}>
              {varieties.length ? varieties.map((item) => <OptionRow key={item.id} label={item.label} onPress={() => { setVarietyId(item.id); setOpen(null); }} selected={item.id === varietyId} />) : <Text style={styles.none}>No hay variedades activas en el catálogo.</Text>}
            </Select>
            <View style={styles.pair}>
              <View style={styles.half}>
                <Select label="CALIDAD" onToggle={() => setOpen(open === 'quality' ? null : 'quality')} open={open === 'quality'} placeholder="Sin calidad" value={quality?.label}>
                  <OptionRow label="Sin calidad" onPress={() => { setQualityId(null); setOpen(null); }} selected={qualityId === null} />
                  {qualities.map((item) => <OptionRow key={item.id} label={item.label} onPress={() => { setQualityId(item.id); setOpen(null); }} selected={item.id === qualityId} />)}
                </Select>
              </View>
              <View style={styles.half}>
                <Text style={styles.label}>PRECIO X KG (S/)</Text>
                <SheetInput accessibilityLabel="Precio por kilogramo del lote (S/)" keyboardType="decimal-pad" onChangeText={setUnitPrice} placeholder="0.00" style={styles.input} value={unitPrice} />
              </View>
            </View>
            {origins.length ? (
              <Select label="PROCEDENCIA" onToggle={() => setOpen(open === 'origin' ? null : 'origin')} open={open === 'origin'} placeholder="Sin procedencia" value={origin?.label}>
                <OptionRow label="Sin procedencia" onPress={() => { setOriginId(null); setOpen(null); }} selected={originId === null} />
                {origins.map((item) => <OptionRow key={item.id} label={item.label} onPress={() => { setOriginId(item.id); setOpen(null); }} selected={item.id === originId} />)}
              </Select>
            ) : null}
            {editing ? null : (
              <Select label="CANTIDAD INICIAL DE SACOS" onToggle={() => setOpen(open === 'planned' ? null : 'planned')} open={open === 'planned'} placeholder="" value={plannedLabel(planned)}>
                {plannedOptions.map((count) => <OptionRow key={count} label={plannedLabel(count)} onPress={() => { setPlanned(count); setOpen(null); }} selected={count === planned} />)}
              </Select>
            )}
          </ScrollView>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={cancel} style={styles.cancel}><Text style={styles.cancelText}>Cancelar</Text></Pressable>
            <Pressable accessibilityLabel={editing ? 'Guardar cambios del lote' : 'Crear lote'} accessibilityRole="button" accessibilityState={{ disabled: !varietyId }} disabled={!varietyId} onPress={create} style={({ pressed }) => [styles.create, (pressed || !varietyId) && styles.dimmed]}>
              <SymbolView fallback={null} name={{ android: 'check', ios: 'checkmark', web: 'check' }} size={18} tintColor="#FFFFFF" />
              <Text style={styles.createText}>{editing ? 'Guardar cambios' : 'Crear lote'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Select({ children, label, onToggle, open, placeholder, value }: { children: React.ReactNode; label: string; onToggle: () => void; open: boolean; placeholder: string; value?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable accessibilityLabel={`${label.toLowerCase()}: ${value ?? placeholder}`} accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={onToggle} style={styles.select}>
        <Text numberOfLines={1} style={[styles.selectText, !value && styles.placeholder]}>{value ?? placeholder}</Text>
        <SymbolView fallback={null} name={{ android: open ? 'expand_less' : 'expand_more', ios: 'chevron.down', web: 'expand_more' }} size={20} tintColor="#475569" />
      </Pressable>
      {open ? <View style={styles.options}>{children}</View> : null}
    </View>
  );
}

function OptionRow({ label, onPress, selected }: { label: string; onPress: () => void; selected: boolean }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onPress} style={[styles.option, selected && styles.optionSelected]}>
      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { alignItems: 'center', backgroundColor: 'rgba(15,23,42,0.45)', flex: 1, justifyContent: 'center', padding: 24 },
  card: { backgroundColor: color.surfaceRaised, borderRadius: 16, boxShadow: '0px 16px 40px rgba(15,23,42,0.25)', maxHeight: '90%', maxWidth: 520, width: '100%' },
  head: { alignItems: 'center', borderBottomColor: '#E2E8F0', borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  titleRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  title: { color: '#0F172A', fontSize: 18, fontWeight: '700' },
  close: { alignItems: 'center', height: 40, justifyContent: 'center', width: 40 },
  body: { gap: 14, padding: 20 },
  pair: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  half: { flexBasis: 200, flexGrow: 1, gap: 6 },
  field: { gap: 6 },
  label: { color: '#475569', fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  select: { alignItems: 'center', backgroundColor: '#EFF4FF', borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', minHeight: 46, paddingHorizontal: 12 },
  selectText: { color: '#0F172A', flex: 1, fontSize: 15, fontWeight: '600' },
  placeholder: { color: '#64748B', fontWeight: '500' },
  input: { backgroundColor: '#EFF4FF', borderColor: 'transparent', fontSize: 15, fontWeight: '600', minHeight: 46 },
  options: { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  option: { justifyContent: 'center', minHeight: 44, paddingHorizontal: 12 },
  optionSelected: { backgroundColor: '#ECFDF5' },
  optionText: { color: '#1E293B', fontSize: 15 },
  optionTextSelected: { color: accent.emerald.pillInk, fontWeight: '700' },
  none: { color: '#64748B', fontSize: 14, padding: 12 },
  actions: { alignItems: 'center', flexDirection: 'row', gap: 12, justifyContent: 'flex-end', paddingBottom: 18, paddingHorizontal: 20 },
  cancel: { justifyContent: 'center', minHeight: 44, paddingHorizontal: 12 },
  cancelText: { color: '#475569', fontSize: 14, fontWeight: '600' },
  create: { alignItems: 'center', backgroundColor: '#047857', borderRadius: 10, flexDirection: 'row', gap: 6, minHeight: 44, paddingHorizontal: 16 },
  createText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  dimmed: { opacity: 0.5 },
});
