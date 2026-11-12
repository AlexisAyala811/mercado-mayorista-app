import { useEffect, useRef, useState } from 'react';
import { Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { SheetInput } from '@/features/reception/screens/purchase-sheet';
import { SymbolView } from '@/ui/components/symbol';
import { accent, color } from '@/ui/tokens';

export type LotChoice = { id: string; label: string };
export type ChoiceKind = 'variety' | 'quality' | 'origin';
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
  // «Escribir otra…» of each list (CL-ST26): registers the typed name in the
  // catalog and returns it. Without it (Encargado, sin conexión) the row is hidden.
  onCreateChoice?: (kind: ChoiceKind, name: string) => Promise<LotChoice>;
};

// Sacks the lot starts with: empty cells to type their weights (spec 011,
// CL-ST22). More can be added with «+ Añadir 1 saco».
export const plannedOptions = [5, 10, 20, 30, 50] as const;
const plannedLabel = (count: number) => `${count} sacos${count === 10 ? ' (lote estándar)' : ''}`;

type Open = 'variety' | 'quality' | 'origin' | 'planned' | null;

// «Añadir nuevo lote / variedad» of the Stitch sale mockup: variety, quality,
// price per kilogram and the initial number of sacks.
export function LotDialog({ initial, onCancel, onCreate, onCreateChoice, origins = [], qualities, varieties, visible }: Props) {
  const editing = Boolean(initial);
  const [varietyId, setVarietyId] = useState<string | null>(initial?.varietyId ?? null);
  const [qualityId, setQualityId] = useState<string | null>(initial?.qualityId ?? null);
  const [originId, setOriginId] = useState<string | null>(initial?.originId ?? null);
  const [unitPrice, setUnitPrice] = useState(initial?.unitPrice ?? '');
  const [planned, setPlanned] = useState<number>(10);
  const [open, setOpen] = useState<Open>(null);
  // Choices registered here appear at once, before the parent lists refresh.
  const [added, setAdded] = useState<Record<ChoiceKind, LotChoice[]>>({ variety: [], quality: [], origin: [] });
  const withAdded = (kind: ChoiceKind, list: LotChoice[]) => [...list, ...added[kind].filter((item) => !list.some((known) => known.id === item.id))];
  varieties = withAdded('variety', varieties); qualities = withAdded('quality', qualities); origins = withAdded('origin', origins);
  // With the keyboard open (keyboard = its top edge) the window goes to the top and fits the free space,
  // so the field being typed stays visible (CL-ST26).
  const [keyboard, setKeyboard] = useState(0);
  const { height } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const priceY = useRef(0);
  const fieldY = useRef({ variety: 0, origin: 0 });
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (event) => setKeyboard(event.endCoordinates.screenY || height - event.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboard(0));
    return () => { show.remove(); hide.remove(); };
  }, [height]);
  const reveal = (y: number) => { setTimeout(() => scrollRef.current?.scrollTo({ animated: true, y: Math.max(0, y - 8) }), 150); };
  async function write(kind: ChoiceKind, name: string) {
    const choice = await onCreateChoice!(kind, name);
    setAdded((current) => ({ ...current, [kind]: [...current[kind], choice] }));
    if (kind === 'variety') setVarietyId(choice.id); else if (kind === 'quality') setQualityId(choice.id); else setOriginId(choice.id);
    setOpen(null);
  }
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
      <View style={[styles.backdrop, keyboard > 0 && styles.backdropTop]}>
        <View accessibilityViewIsModal style={[styles.card, keyboard > 0 && { maxHeight: Math.max(220, keyboard - 24) }]}>
          <View style={styles.head}>
            <View style={styles.titleRow}>
              <SymbolView fallback={null} name={{ android: 'add_box', ios: 'plus.square', web: 'add_box' }} size={22} tintColor={accent.emerald.ink} />
              <Text accessibilityRole="header" style={styles.title}>{editing ? 'Editar lote / variedad' : 'Añadir nuevo lote / variedad'}</Text>
            </View>
            <Pressable accessibilityLabel="Cerrar" accessibilityRole="button" hitSlop={8} onPress={cancel} style={styles.close}>
              <SymbolView fallback={null} name={{ android: 'close', ios: 'xmark', web: 'close' }} size={20} tintColor="#475569" />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" ref={scrollRef}>
            <Select label="VARIEDAD / NOMBRE" onLayoutY={(y) => { fieldY.current.variety = y; }} onToggle={() => setOpen(open === 'variety' ? null : 'variety')} open={open === 'variety'} placeholder="Elige la variedad" value={variety?.label}>
              {varieties.length ? varieties.map((item) => <OptionRow key={item.id} label={item.label} onPress={() => { setVarietyId(item.id); setOpen(null); }} selected={item.id === varietyId} />) : <Text style={styles.none}>No hay variedades activas en el catálogo.</Text>}
              {onCreateChoice ? <WriteRow kind="variety" noun="variedad" onReveal={(y) => reveal(fieldY.current.variety + optionsTop + y)} onWrite={write} /> : null}
            </Select>
            <View onLayout={(event) => { priceY.current = event.nativeEvent.layout.y; }} style={styles.pair}>
              <View style={styles.half}>
                <Select label="CALIDAD" onToggle={() => setOpen(open === 'quality' ? null : 'quality')} open={open === 'quality'} placeholder="Sin calidad" value={quality?.label}>
                  <OptionRow label="Sin calidad" onPress={() => { setQualityId(null); setOpen(null); }} selected={qualityId === null} />
                  {qualities.map((item) => <OptionRow key={item.id} label={item.label} onPress={() => { setQualityId(item.id); setOpen(null); }} selected={item.id === qualityId} />)}
                  {onCreateChoice ? <WriteRow kind="quality" noun="calidad" onReveal={(y) => reveal(priceY.current + optionsTop + y)} onWrite={write} /> : null}
                </Select>
              </View>
              <View style={styles.half}>
                <Text style={styles.label}>PRECIO X KG (S/)</Text>
                <SheetInput accessibilityLabel="Precio por kilogramo del lote (S/)" autoComplete="off" autoCorrect={false} importantForAutofill="no" keyboardType="decimal-pad" onChangeText={setUnitPrice} onFocus={() => reveal(priceY.current)} placeholder="0.00" style={styles.input} value={unitPrice} />
              </View>
            </View>
            {origins.length || onCreateChoice ? (
              <Select label="PROCEDENCIA" onLayoutY={(y) => { fieldY.current.origin = y; }} onToggle={() => setOpen(open === 'origin' ? null : 'origin')} open={open === 'origin'} placeholder="Sin procedencia" value={origin?.label}>
                <OptionRow label="Sin procedencia" onPress={() => { setOriginId(null); setOpen(null); }} selected={originId === null} />
                {origins.map((item) => <OptionRow key={item.id} label={item.label} onPress={() => { setOriginId(item.id); setOpen(null); }} selected={item.id === originId} />)}
                {onCreateChoice ? <WriteRow kind="origin" noun="procedencia" onReveal={(y) => reveal(fieldY.current.origin + optionsTop + y)} onWrite={write} /> : null}
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

// Label and closed control above the options: where a list starts in its field.
const optionsTop = 74;

function Select({ children, label, onLayoutY, onToggle, open, placeholder, value }: { children: React.ReactNode; label: string; onLayoutY?: (y: number) => void; onToggle: () => void; open: boolean; placeholder: string; value?: string }) {
  return (
    <View onLayout={onLayoutY ? (event) => onLayoutY(event.nativeEvent.layout.y) : undefined} style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable accessibilityLabel={`${label.toLowerCase()}: ${value ?? placeholder}`} accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={onToggle} style={styles.select}>
        <Text numberOfLines={1} style={[styles.selectText, !value && styles.placeholder]}>{value ?? placeholder}</Text>
        <SymbolView fallback={null} name={{ android: open ? 'expand_less' : 'expand_more', ios: 'chevron.down', web: 'expand_more' }} size={20} tintColor="#475569" />
      </Pressable>
      {open ? <View style={styles.options}>{children}</View> : null}
    </View>
  );
}

// Last row of a list: type a name that is not in the catalog yet.
function WriteRow({ kind, noun, onReveal, onWrite }: { kind: ChoiceKind; noun: string; onReveal: (y: number) => void; onWrite: (kind: ChoiceKind, name: string) => Promise<void> }) {
  const [writing, setWriting] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const y = useRef(0);
  const ready = name.trim().length > 0 && !saving;
  async function submit() {
    if (!ready) return;
    setSaving(true); setError(null);
    try { await onWrite(kind, name.trim()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : `No se pudo registrar la ${noun}.`); setSaving(false); }
  }
  if (!writing) {
    return (
      <Pressable accessibilityLabel={`Escribir otra ${noun}`} accessibilityRole="button" onPress={() => setWriting(true)} style={[styles.option, styles.writeOption]}>
        <SymbolView fallback={null} name={{ android: 'edit', ios: 'pencil', web: 'edit' }} size={16} tintColor={accent.emerald.ink} />
        <Text style={styles.writeText}>Escribir otra {noun}…</Text>
      </Pressable>
    );
  }
  return (
    <View onLayout={(event) => { y.current = event.nativeEvent.layout.y; }} style={styles.writeBox}>
      <View style={styles.writeRow}>
        <SheetInput accessibilityLabel={`Nombre de la nueva ${noun}`} autoCapitalize="words" autoComplete="off" autoCorrect={false} autoFocus importantForAutofill="no" maxLength={120} onChangeText={setName} onFocus={() => onReveal(y.current)} onSubmitEditing={submit} placeholder={`Nombre de la ${noun}`} returnKeyType="done" style={[styles.input, styles.writeInput]} submitBehavior="submit" value={name} />
        <Pressable accessibilityLabel={`Añadir ${noun}`} accessibilityRole="button" accessibilityState={{ disabled: !ready }} disabled={!ready} onPress={submit} style={[styles.writeAdd, !ready && styles.dimmed]}>
          <Text style={styles.createText}>{saving ? 'Guardando…' : 'Añadir'}</Text>
        </Pressable>
      </View>
      {error ? <Text accessibilityLiveRegion="polite" style={styles.writeError}>{error}</Text> : <Text style={styles.writeHint}>Se guarda en el catálogo y queda elegida.</Text>}
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
  backdropTop: { justifyContent: 'flex-start', paddingTop: 12 },
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
  writeOption: { alignItems: 'center', justifyContent: 'flex-start', borderTopColor: '#E2E8F0', borderTopWidth: 1, flexDirection: 'row', gap: 8 },
  writeText: { color: accent.emerald.ink, fontSize: 15, fontWeight: '600' },
  writeBox: { borderTopColor: '#E2E8F0', borderTopWidth: 1, gap: 6, padding: 10 },
  writeRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  writeInput: { flex: 1 },
  writeAdd: { alignItems: 'center', backgroundColor: '#047857', borderRadius: 10, justifyContent: 'center', minHeight: 46, paddingHorizontal: 16 },
  writeHint: { color: '#64748B', fontSize: 12 },
  writeError: { color: color.danger, fontSize: 12 },
});
