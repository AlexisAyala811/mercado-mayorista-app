import { SymbolView } from '@/ui/components/symbol';
import { useContext, useEffect, useMemo, useRef, useState, type ReactNode, type Ref } from 'react';
import { Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { emptyLotDraft, formatPreviewMoney, previewLotAmount, type PurchaseLot, type PurchasePreview } from '@/domain/reception/purchase-preview';
import { formatKilograms } from '@/domain/reception/whole-kilograms';
import { moneyInputToCents } from '@/domain/reception/reception';
import { InstallmentRows } from '@/features/reception/components/installment-rows';
import { DateDialog } from '@/features/sales/components/date-dialog';
import type { LotField } from '@/features/reception/components/settlement-lots';
import type { ReceptionDetails } from '@/features/reception/screens/reception-details-screen';
import type { SettlementDraft, SettlementField } from '@/features/reception/screens/settlement-screen';
import { AppScreen, FeedbackState, FormField, SelectionField } from '@/ui/components';
import { KeyboardFocusContext } from '@/ui/components/keyboard-focus-context';
import { useBottomNav } from '@/ui/navigation/app-chrome';
import { AppHeader } from '@/ui/navigation/app-header';
import { accent, color, radius, spacing } from '@/ui/tokens';

// One sack in the grid. The cell shows the gross weight typed on the tablet;
// the tare is the one of the lot (CL-ST20).
export type SheetSack = { id: string; sequence: number; varietyId: string; netDisplay: string; grossDisplay?: string; detail: string };
export type SheetVariety = { id: string; name: string };

export const sheetColumns = 5;
export const sheetRowHeight = 56;
const gridMaxHeight = 380;
// Rows drawn above and below the visible ones.
const gridOverscan = 4;
const gridVisibleRows = Math.ceil(gridMaxHeight / sheetRowHeight);
// As in the sale, a lot shows at least ten cells; the empty ones lead to the
// cell where the next sack is typed (CL-ST27).
const plannedCells = 10;

export type PurchaseSheetProps = {
  notice?: string;
  noticeTitle?: string;
  errorMessage?: string;
  busy?: boolean;
  blocked?: boolean;
  // Header: editable until the reception exists.
  details: ReceptionDetails;
  detailsLocked: boolean;
  onChangeDetail: (field: keyof ReceptionDetails, value: string) => void;
  onSelectProvider: () => void;
  // Provider typed in its box with the matches of the catalog (CL-ST28).
  onProviderNameChange?: (value: string) => void;
  providerSuggestions?: { id: string; label: string; supportingText?: string }[];
  onPickProvider?: (id: string) => void;
  providerNotice?: string;
  // ✎ of the lot and × of a sack (CL-ST28).
  onEditLot?: () => void;
  onVoidSack?: (id: string) => void;
  // Number of the next sack: voided sacks keep their numbers.
  nextSequence?: number;
  onSelectVehicle: () => void;
  referenceActions?: ReactNode;
  // Lots: one tab per variety of the purchase.
  varieties: SheetVariety[];
  activeVarietyId: string;
  onSelectVariety: (id: string) => void;
  onAddVariety?: () => void;
  // Removes a variety without sacks before the reception exists.
  onRemoveVariety?: (id: string) => void;
  // Why «Añadir lote» is disabled (the reception already has sacks).
  addVarietyLockedReason?: string;
  // Quality of the next sacks, shown in the lot chip.
  qualityName?: string | null;
  // Weighing.
  sacks: SheetSack[];
  weighingLocked: boolean;
  gross: string;
  tare: string;
  onGrossChange: (value: string) => void;
  onTareChange: (value: string) => void;
  editingSequence: number | null;
  onEditSack: (id: string) => void;
  onCancelEdit: () => void;
  onSaveSack: () => void;
  // «Carga rápida»: registers ten sacks of 50 kg with the tare of the lot.
  onQuickLoad?: () => void;
  characteristics?: ReactNode;
  // Settlement.
  lots: readonly PurchaseLot[];
  values: SettlementDraft;
  preview: PurchasePreview;
  onChange: (field: SettlementField, value: string) => void;
  onChangeLot: (key: string, field: LotField, value: string) => void;
  onAddInstallment: () => void;
  onChangeInstallment: (id: string, field: 'amount' | 'dueOn', value: string) => void;
  onRemoveInstallment: (id: string) => void;
  // Actions.
  onClear?: () => void;
  onSave: () => void;
  onBack: () => void;
  onGoHome: () => void;
};

const letter = (index: number) => String.fromCharCode(65 + index);
const sackWord = (count: number) => (count === 1 ? 'saco' : 'sacos');

// Compra on one screen (spec 011, RQ-ST13, CL-ST11, CL-ST20): the Stitch
// «Registro de compra multilotes» layout: provider data in one row, one tab per
// variety, each sack typed in its own cell of a five-column grid (200 or more
// sacks stay fluid: rows have a fixed height and only the visible ones are
// drawn), «+ Añadir 1 saco» with the tare of the lot beside it, the subtotal,
// the consolidated table with the price of each lot, freight, the settlement
// summary and «Guardar compra».
export function PurchaseSheet(props: PurchaseSheetProps) {
  const { preview, values } = props;
  const screenRef = useRef<ScrollView>(null);
  const tableY = useRef(0);
  const gridRef = useRef<ScrollView>(null);
  const [firstRow, setFirstRow] = useState(0);
  const [target, setTarget] = useState('');
  const [targetMessage, setTargetMessage] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [characteristicsOpen, setCharacteristicsOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  // ✓ of the keyboard: celular → conductor → the cell of the next sack.
  const driverRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const draftRef = useRef<TextInput>(null);
  const locked = Boolean(props.busy || props.blocked);

  const active = props.varieties.find((variety) => variety.id === props.activeVarietyId) ?? props.varieties[0];
  const activeIndex = active ? props.varieties.indexOf(active) : -1;
  const activeSacks = useMemo(() => props.sacks.filter((sack) => sack.varietyId === active?.id), [active?.id, props.sacks]);
  const nextSequence = props.nextSequence ?? props.sacks.reduce((max, sack) => Math.max(max, sack.sequence), 0) + 1;
  const editing = props.editingSequence !== null;
  // The trailing cell is where the next sack is typed.
  const draft = !props.weighingLocked && Boolean(active) && !editing;
  const cells = useMemo(() => {
    const filled = [...activeSacks.map((sack) => ({ kind: 'sack' as const, sack })), ...(draft ? [{ kind: 'draft' as const }] : [])];
    const blanks = draft ? Math.max(0, plannedCells - filled.length) : 0;
    return [...filled, ...Array.from({ length: blanks }, (_, index) => ({ kind: 'blank' as const, offset: index + 1 }))];
  }, [activeSacks, draft]);
  const shownCells = Math.max(activeSacks.length, draft ? plannedCells : 0);
  // A sack saved with ✓ keeps the cursor in the cell of the next one, also
  // when that cell starts a new row (CL-ST27), and after a correction (CL-ST29).
  const keepTyping = useRef(false);
  useEffect(() => {
    // Wait until the cell of the next sack exists (a correction ends first).
    if (!keepTyping.current || editing || !draftRef.current) return undefined;
    keepTyping.current = false;
    const timer = setTimeout(() => draftRef.current?.focus(), 250);
    return () => clearTimeout(timer);
  }, [activeSacks, editing]);
  const rows = useMemo(() => {
    const chunks: (typeof cells)[] = [];
    for (let index = 0; index < cells.length; index += sheetColumns) chunks.push(cells.slice(index, index + sheetColumns));
    return chunks;
  }, [cells]);
  // Window of rows drawn in the grid; the spacers keep the scroll height.
  const windowStart = Math.max(0, Math.min(firstRow, Math.max(0, rows.length - gridVisibleRows)) - gridOverscan);
  const windowEnd = Math.min(rows.length, windowStart + gridVisibleRows + gridOverscan * 2);
  const count = (varietyId: string) => props.sacks.reduce((total, sack) => total + (sack.varietyId === varietyId ? 1 : 0), 0);
  const activeLots = props.lots.filter((lot) => lot.varietyId === active?.id);
  const activeKilograms = activeLots.reduce((total, lot) => total + lot.grams, 0n);
  const totalSacks = props.lots.reduce((total, lot) => total + lot.sacks, 0);
  const totalGrams = props.lots.reduce((total, lot) => total + lot.grams, 0n);
  const canCapture = Boolean(active) && !props.weighingLocked && !locked;
  // The cells stay editable while a sack is being saved so the keyboard and
  // the focus are kept between sacks; saving is what waits.
  const captureEditable = Boolean(active) && !props.weighingLocked && !props.blocked;
  const canAdd = canCapture && props.gross.trim().length > 0;
  const money = (field: 'grossCents' | 'freightCents' | 'liquidCents') => (preview.kind === 'ready' ? formatPreviewMoney(preview[field]) : 'Pendiente');
  const canSave = !locked && props.sacks.length > 0 && preview.kind === 'ready';
  // Freight as in the sale (CL-ST28): «Por sacos» or «Por kilaje»; a rate of
  // 0 means the purchase goes without freight.
  const freightOn = (moneyInputToCents(values.freightRate) ?? 0) > 0;
  const basis = values.freightBasis === 'none' ? 'sack' : values.freightBasis;
  const wholesalerFreight = freightOn && values.freightChargedTo === 'wholesaler';

  useBottomNav({
    back: { label: 'Atrás', disabled: props.busy, onPress: props.onBack },
    home: { label: 'Menú principal', disabled: props.busy, onPress: props.onGoHome },
    next: { label: 'Guardar compra', disabled: !canSave, onPress: props.onSave },
  });

  function goToSack() {
    const typed = target.trim();
    if (!/^\d{1,6}$/.test(typed)) { setTargetMessage('Escribe el número del saco.'); return; }
    const sack = props.sacks.find((item) => item.sequence === Number(typed));
    if (!sack) { setTargetMessage(`No hay un saco ${typed} vigente.`); return; }
    setTargetMessage(null);
    setHighlightedId(sack.id);
    if (sack.varietyId !== active?.id) { props.onSelectVariety(sack.varietyId); return; }
    const index = Math.floor(activeSacks.indexOf(sack) / sheetColumns);
    setFirstRow(index);
    gridRef.current?.scrollTo({ animated: true, y: Math.max(0, (index - 2) * sheetRowHeight) });
  }

  return (
    <AppScreen contentContainerStyle={s.screen} scrollRef={screenRef} testID="purchase-sheet">
      <AppHeader eyebrow="MÓDULO DE COMPRA" subtitle="Recepción y pesaje en centro de acopio" title="Compra" />
      {props.notice ? <FeedbackState title={props.noticeTitle ?? 'Pendiente de confirmación central'} message={props.notice} /> : null}
      {props.errorMessage ? <FeedbackState title="No se pudo completar la operación" message={props.errorMessage} tone="error" /> : null}

      <View style={[s.card, sheetLayout.details]} testID="sheet-details">
        <View style={sheetLayout.detailWide}>
          {props.onProviderNameChange ? (
            <>
              <FormField appearance="stitch" autoComplete="off" autoCorrect={false} editable={!props.detailsLocked && !locked} importantForAutofill="no" label="Nombre del proveedor / productor" leadingIcon="person" maxLength={160} onChangeText={props.onProviderNameChange} onSubmitEditing={() => phoneRef.current?.focus()} placeholder="Nombre del productor o comunidad…" returnKeyType="next" submitBehavior="submit" value={props.details.providerName} />
              {props.providerSuggestions?.length ? (
                <View accessibilityLabel="Proveedores que coinciden" style={sheetLayout.suggestions}>
                  {props.providerSuggestions.map((item) => (
                    <Pressable accessibilityHint="Completa el celular del proveedor" accessibilityLabel={`Elegir ${item.label}`} accessibilityRole="button" key={item.id} onPress={() => props.onPickProvider?.(item.id)} style={({ pressed }) => [sheetLayout.suggestion, pressed && s.dimmed]}>
                      <SymbolView fallback={null} name={{ android: 'person', ios: 'person', web: 'person' }} size={16} tintColor="#727974" />
                      <Text numberOfLines={1} style={sheetLayout.suggestionText}>{item.label}</Text>
                      {item.supportingText ? <Text numberOfLines={1} style={sheetLayout.suggestionHint}>{item.supportingText}</Text> : null}
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </>
          ) : <SelectionField appearance="stitch" disabled={props.detailsLocked || locked} label="Nombre del proveedor / productor" leadingIcon="person" onPress={props.onSelectProvider} placeholder="Nombre del productor o comunidad…" value={props.details.providerName} />}
        </View>
        <View style={sheetLayout.detail}><FormField appearance="stitch" autoComplete="off" autoCorrect={false} importantForAutofill="no" editable={!props.detailsLocked && !locked} keyboardType="phone-pad" label="N.° celular" onSubmitEditing={() => driverRef.current?.focus()} ref={phoneRef} returnKeyType="next" submitBehavior="submit" leadingIcon="call" onChangeText={(value) => props.onChangeDetail('providerPhone', value)} placeholder="999 000 000" value={props.details.providerPhone} /></View>
        <View style={sheetLayout.detail}><FormField appearance="stitch" autoComplete="off" autoCorrect={false} importantForAutofill="no" editable={!props.detailsLocked && !locked} label="Conductor" onSubmitEditing={() => (draftRef.current ? draftRef.current.focus() : Keyboard.dismiss())} ref={driverRef} returnKeyType="next" submitBehavior="submit" leadingIcon="badge" onChangeText={(value) => props.onChangeDetail('driverName', value)} placeholder="Nombre del conductor" value={props.details.driverName} /></View>
        <View style={[sheetLayout.detail, sheetLayout.dateField]}>
          <Text style={sheetLayout.dateLabel}>FECHA DE ACOPIO</Text>
          <Pressable accessibilityHint="Abre el calendario con Hoy y Mañana" accessibilityLabel={`Fecha de acopio: ${props.details.date}`} accessibilityRole="button" accessibilityState={{ disabled: props.detailsLocked || locked }} disabled={props.detailsLocked || locked} onPress={() => { Keyboard.dismiss(); setDateOpen(true); }} style={({ pressed }) => [sheetLayout.dateControl, pressed && s.dimmed]} testID="purchase-date">
            <SymbolView fallback={null} name={{ android: 'calendar_today', ios: 'calendar', web: 'calendar_today' }} size={20} tintColor="#74777F" />
            <Text style={[sheetLayout.dateValue, props.detailsLocked && sheetLayout.dateValueLocked]}>{props.details.date}</Text>
          </Pressable>
        </View>
        {props.providerNotice ? <Text accessibilityLiveRegion="polite" style={sheetLayout.providerNotice}>{props.providerNotice}</Text> : null}
      </View>

      <View style={[s.card, s.tabsCard]}>
        <View accessibilityRole="tablist" style={s.tabs}>
          {props.varieties.length ? props.varieties.map((variety, index) => {
            const selected = variety.id === active?.id;
            const total = count(variety.id);
            return (
              <Pressable
                accessibilityLabel={`Lote ${letter(index)}: ${variety.name}, ${total} ${sackWord(total)}`}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                key={variety.id}
                onPress={() => props.onSelectVariety(variety.id)}
                style={[s.tab, selected && s.tabSelected]}
                testID={`lot-tab-${letter(index)}`}>
                <View style={[s.tabLetter, selected && s.tabLetterSelected]}><Text style={[s.tabLetterText, selected && s.onBrand]}>{letter(index)}</Text></View>
                <Text numberOfLines={1} style={[s.tabName, selected && s.onBrand]}>{variety.name}</Text>
                <View style={[s.tabCount, selected && s.tabCountSelected]}><Text style={[s.tabCountText, selected && s.onBrand]}>{total} {sackWord(total)}</Text></View>
              </Pressable>
            );
          }) : <Text style={s.help}>Añade la primera variedad para empezar a pesar.</Text>}
        </View>
        {/* Edit providers / varieties sit by «Añadir lote» so the details
            stay one row, as in the mockup. */}
        {props.detailsLocked ? null : <View style={sheetLayout.tabsLinks}>{props.referenceActions}</View>}
        {/* After the first sack the server only takes the varieties chosen
            at the start: the button stays, disabled, with the reason. */}
        {props.onAddVariety || props.addVarietyLockedReason ? (
          <Pressable accessibilityHint={props.addVarietyLockedReason} accessibilityLabel="Añadir lote o variedad" accessibilityRole="button" accessibilityState={{ disabled: locked || !props.onAddVariety }} disabled={locked || !props.onAddVariety} onPress={props.onAddVariety} style={({ pressed }) => [s.addLot, (pressed || locked || !props.onAddVariety) && s.dimmed]}>
            <SymbolView fallback={null} name={{ android: 'add_circle', ios: 'plus.circle', web: 'add_circle' }} size={20} tintColor={color.textOnBrand} />
            <Text style={s.addLotText}>+ Añadir lote / variedad</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={s.card} testID="sheet-lot">
        {active ? (
        <View style={s.lotHeader}>
          <View style={s.lotChip}>
            <SymbolView fallback={null} name={{ android: 'inventory_2', ios: 'shippingbox', web: 'inventory_2' }} size={20} tintColor="#6EE7B7" />
            <Text numberOfLines={1} style={s.lotChipText}>{active?.name ?? 'Sin variedad'}</Text>
            {props.qualityName ? <View style={sheetLayout.quality}><Text style={sheetLayout.qualityText}>{props.qualityName}</Text></View> : null}
            {(props.onEditLot || props.characteristics) && !props.weighingLocked ? (
              <Pressable accessibilityLabel={props.onEditLot ? 'Editar o cambiar variedad y calidad' : 'Cambiar calidad y procedencia de los próximos sacos'} accessibilityRole="button" disabled={locked} onPress={() => (props.onEditLot ? props.onEditLot() : setCharacteristicsOpen(true))} style={sheetLayout.edit}>
                <SymbolView fallback={null} name={{ android: 'edit', ios: 'pencil', web: 'edit' }} size={17} tintColor="#6EE7B7" />
              </Pressable>
            ) : null}
          </View>
          <View style={sheetLayout.lotEnd}>
            {active ? <View style={s.lotBadge}><Text style={s.lotBadgeText}>Lote {letter(activeIndex)}</Text></View> : null}
            {props.onRemoveVariety && active && !activeSacks.length ? (
              <Pressable accessibilityLabel={`Quitar lote ${letter(activeIndex)}`} accessibilityRole="button" disabled={locked} onPress={() => props.onRemoveVariety?.(active.id)} style={sheetLayout.remove}>
                <SymbolView fallback={null} name={{ android: 'delete_sweep', ios: 'trash', web: 'delete_sweep' }} size={16} tintColor={color.danger} />
                <Text style={sheetLayout.removeText}>Quitar lote</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
        ) : null}

        <View style={s.gridHeader}>
          <View style={sheetLayout.gridTitle}>
            <Text accessibilityRole="header" style={s.overline}>PESAJE DE SACOS INDIVIDUALES (KG)</Text>
            <Text style={sheetLayout.gridHint}>{props.weighingLocked ? '· Pesaje cerrado: el detalle queda bloqueado' : '· Escribe el peso bruto en la celda; toca un saco para corregirlo'}</Text>
          </View>
          <View style={s.goTo}>
            <SheetInput accessibilityLabel="Número del saco" keyboardType="number-pad" onChangeText={(value) => { setTarget(value); setTargetMessage(null); }} onSubmitEditing={goToSack} placeholder="Ir al saco N.°" returnKeyType="go" style={sheetLayout.goToInput} value={target} />
            <Pressable accessibilityLabel="Ir al saco" accessibilityRole="button" disabled={!props.sacks.length} onPress={goToSack} style={({ pressed }) => [sheetLayout.goToButton, (pressed || !props.sacks.length) && s.dimmed]}><SymbolView fallback={null} name={{ android: 'search', ios: 'magnifyingglass', web: 'search' }} size={18} tintColor={color.brand} /></Pressable>
            <View style={s.countBadge}><Text style={s.countBadgeText}>{activeSacks.length} de {shownCells} {sackWord(shownCells)} registrados</Text></View>
          </View>
        </View>
        {targetMessage ? <Text accessibilityLiveRegion="polite" style={s.targetMessage}>{targetMessage}</Text> : null}

        <View style={s.gridBox}>
          {rows.length ? null : <Text style={s.empty}>{active ? 'Escribe el peso bruto del primer saco.' : 'Elige el proveedor y añade un lote o variedad para empezar a pesar.'}</Text>}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            onScroll={(event) => {
              const row = Math.floor(event.nativeEvent.contentOffset.y / sheetRowHeight);
              if (row !== firstRow) setFirstRow(row);
            }}
            ref={gridRef}
            scrollEventThrottle={32}
            style={s.grid}
            testID="sack-grid">
            <View style={{ height: Math.max(0, windowStart) * sheetRowHeight }} />
            {rows.slice(windowStart, windowEnd).map((row, position) => (
              <View key={`row-${windowStart + position}`} style={s.gridRow}>
                {row.map((cell) => {
                  if (cell.kind === 'blank') {
                    return (
                      <Pressable accessibilityElementsHidden importantForAccessibility="no-hide-descendants" key={`blank-${cell.offset}`} onPress={() => draftRef.current?.focus()} style={[s.cell, sheetLayout.cellBlank]} testID={`sack-blank-${cell.offset}`}>
                        <View style={[s.cellNumber, sheetLayout.cellNumberBlank]}><Text style={[s.cellNumberText, sheetLayout.cellNumberBlankText]}>{String(nextSequence + cell.offset).padStart(2, '0')}</Text></View>
                        <View style={s.cellValue}><Text style={sheetLayout.cellBlankText}>0</Text></View>
                        <Text style={s.cellUnit}>kg</Text>
                        <View style={[sheetLayout.clear, sheetLayout.clearIdle]}><SymbolView fallback={null} name={{ android: 'close', ios: 'xmark', web: 'close' }} size={14} tintColor="#727974" /></View>
                      </Pressable>
                    );
                  }
                  if (cell.kind === 'draft') {
                    return (
                      <View key="draft" style={[s.cell, sheetLayout.cellDraft]} testID="sack-draft">
                        <View style={[s.cellNumber, sheetLayout.cellNumberDraft]}><Text style={s.cellNumberText}>{String(nextSequence).padStart(2, '0')}</Text></View>
                        <SheetInput accessibilityLabel="Peso bruto (kg)" autoComplete="off" autoCorrect={false} importantForAutofill="no" editable={captureEditable} keyboardType="number-pad" onChangeText={(value) => props.onGrossChange(value.replace(/[^0-9]/g, ''))} onSubmitEditing={canAdd ? () => { keepTyping.current = true; props.onSaveSack(); } : undefined} placeholder="0" ref={draftRef} returnKeyType="next" style={sheetLayout.cellInput} submitBehavior="submit" value={props.gross} />
                        <Text style={s.cellUnit}>kg</Text>
                        <Pressable accessibilityLabel={`Limpiar el peso del saco ${nextSequence}`} accessibilityRole="button" disabled={!props.gross} hitSlop={6} onPress={() => { props.onGrossChange(''); draftRef.current?.focus(); }} style={({ pressed }) => [sheetLayout.clear, !props.gross && sheetLayout.clearIdle, pressed && s.dimmed]}>
                          <SymbolView fallback={null} name={{ android: 'close', ios: 'xmark', web: 'close' }} size={14} tintColor="#727974" />
                        </Pressable>
                      </View>
                    );
                  }
                  const { sack } = cell;
                  const current = sack.sequence === props.editingSequence;
                  if (current) {
                    return (
                      <View key={sack.id} style={[s.cell, s.cellHighlighted]} testID={`sack-${sack.sequence}`}>
                        <View style={s.cellNumber}><Text style={s.cellNumberText}>{String(sack.sequence).padStart(2, '0')}</Text></View>
                        <SheetInput accessibilityLabel="Peso bruto (kg)" autoComplete="off" autoCorrect={false} importantForAutofill="no" autoFocus editable={captureEditable} keyboardType="number-pad" onChangeText={(value) => props.onGrossChange(value.replace(/[^0-9]/g, ''))} onSubmitEditing={canAdd ? () => { keepTyping.current = true; props.onSaveSack(); } : undefined} returnKeyType="done" style={sheetLayout.cellInput} submitBehavior="submit" value={props.gross} />
                        <Text style={s.cellUnit}>kg</Text>
                        <Pressable accessibilityLabel={`Cancelar la corrección del saco ${sack.sequence}`} accessibilityRole="button" disabled={locked} hitSlop={6} onPress={props.onCancelEdit} style={({ pressed }) => [sheetLayout.clear, pressed && s.dimmed]}>
                          <SymbolView fallback={null} name={{ android: 'close', ios: 'xmark', web: 'close' }} size={14} tintColor="#727974" />
                        </Pressable>
                      </View>
                    );
                  }
                  return (
                    <Pressable
                      accessibilityHint={props.weighingLocked ? undefined : 'Corrige el peso de este saco'}
                      accessibilityLabel={`Saco ${sack.sequence}: ${sack.netDisplay} kilos netos. ${sack.detail}`}
                      accessibilityRole="button"
                      disabled={props.weighingLocked || locked}
                      key={sack.id}
                      onPress={() => props.onEditSack(sack.id)}
                      style={({ pressed }) => [s.cell, sack.id === highlightedId && s.cellHighlighted, pressed && s.dimmed]}
                      testID={`sack-${sack.sequence}`}>
                      <View style={s.cellNumber}><Text style={s.cellNumberText}>{String(sack.sequence).padStart(2, '0')}</Text></View>
                      <View style={s.cellValue}><Text style={s.cellValueText}>{sack.grossDisplay ?? sack.netDisplay}</Text></View>
                      <Text style={s.cellUnit}>kg</Text>
                      {!props.weighingLocked ? (
                        <Pressable accessibilityHint={props.onVoidSack ? undefined : 'Para anular un saco se necesita conexión y que esté sincronizado'} accessibilityLabel={`Anular saco ${sack.sequence}`} accessibilityRole="button" accessibilityState={{ disabled: locked || !props.onVoidSack }} disabled={locked || !props.onVoidSack} hitSlop={6} onPress={() => props.onVoidSack?.(sack.id)} style={({ pressed }) => [sheetLayout.clear, pressed && s.dimmed]}>
                          <SymbolView fallback={null} name={{ android: 'close', ios: 'xmark', web: 'close' }} size={14} tintColor="#727974" />
                        </Pressable>
                      ) : null}
                    </Pressable>
                  );
                })}
                {Array.from({ length: sheetColumns - row.length }, (_, index) => <View key={`gap-${index}`} style={[s.cell, s.cellGap]} />)}
              </View>
            ))}
            <View style={{ height: Math.max(0, rows.length - windowEnd) * sheetRowHeight }} />
          </ScrollView>
        </View>

        {props.weighingLocked ? null : (
          <View style={sheetLayout.addRow} testID="sheet-capture">
            <Pressable accessibilityLabel={props.busy ? 'Guardando saco' : editing ? 'Guardar corrección' : 'Añadir saco'} accessibilityRole="button" disabled={!canAdd} onPress={props.onSaveSack} style={({ pressed }) => [sheetLayout.addSack, (pressed || !canAdd) && s.dimmed]} testID="add-sack">
              <SymbolView fallback={null} name={{ android: 'add_circle', ios: 'plus.circle', web: 'add_circle' }} size={18} tintColor={accent.emerald.ink} />
              <Text style={sheetLayout.addSackText}>{props.busy ? 'Guardando…' : editing ? `Guardar corrección del saco ${props.editingSequence}` : '+ Añadir 1 saco'}</Text>
            </Pressable>
            <View style={sheetLayout.tareBox}>
              <SymbolView fallback={null} name={{ android: 'scale', ios: 'scalemass', web: 'scale' }} size={18} tintColor={accent.emerald.pillInk} />
              <Text style={sheetLayout.tareLabel}>{editing ? `Tara del saco ${props.editingSequence}` : 'Tara por saco'}</Text>
              <SheetInput accessibilityLabel="Tara (kg)" autoComplete="off" autoCorrect={false} importantForAutofill="no" editable={captureEditable} keyboardType="number-pad" onChangeText={(value) => props.onTareChange(value.replace(/[^0-9]/g, ''))} placeholder="0" style={sheetLayout.tareInput} value={props.tare} />
              <Text style={sheetLayout.tareUnit}>kg</Text>
              {editing ? <Pressable accessibilityLabel="Cancelar corrección" accessibilityRole="button" disabled={locked} onPress={props.onCancelEdit} style={sheetLayout.cancel}><Text style={sheetLayout.cancelText}>Cancelar</Text></Pressable> : null}
            </View>
            {props.onQuickLoad && !editing ? (
              <Pressable accessibilityHint="Registra diez sacos de 50 kilos brutos con la tara del lote; luego puedes corregir cada peso" accessibilityLabel="Carga rápida de 10 sacos a 50 kilos" accessibilityRole="button" accessibilityState={{ disabled: !canCapture }} disabled={!canCapture} onPress={() => { Keyboard.dismiss(); props.onQuickLoad?.(); }} style={({ pressed }) => [sheetLayout.quickLoad, (pressed || !canCapture) && s.dimmed]} testID="purchase-quick-load">
                <SymbolView fallback={null} name={{ android: 'library_add', ios: 'plus.square.on.square', web: 'library_add' }} size={18} tintColor={accent.emerald.pillInk} />
                <Text style={sheetLayout.quickLoadText}>+ Carga rápida (10 sacos a 50 kg)</Text>
              </Pressable>
            ) : null}
          </View>
        )}

        <View style={sheetLayout.subtotal}>
          <View style={s.subtotalCopy}>
            <SymbolView fallback={null} name={{ android: 'scale', ios: 'scalemass', web: 'scale' }} size={22} tintColor={accent.emerald.ink} />
            <Text style={s.subtotalTitle}>SUBTOTAL LOTE {active ? letter(activeIndex) : ''}</Text>
            <Text style={s.help}>({activeSacks.length} {sackWord(activeSacks.length)} con peso)</Text>
          </View>
          <View style={s.subtotalWeight}>
            <Text style={s.help}>Peso total lote:</Text>
            <Text accessibilityLabel={`Peso total del lote: ${formatKilograms(gramsToKg(activeKilograms))}`} style={s.subtotalValue}>{formatKilograms(gramsToKg(activeKilograms)).replace(' kg', '')}</Text>
            <Text style={sheetLayout.kgUnit}>kg</Text>
          </View>
        </View>
      </View>

      <Pressable accessibilityLabel="Ver cálculo consolidado y liquidación comercial" accessibilityRole="button" onPress={() => screenRef.current?.scrollTo({ animated: true, y: tableY.current })} style={({ pressed }) => [sheetLayout.jump, pressed && s.dimmed]}>
        <Text style={sheetLayout.jumpText}>VER CÁLCULO CONSOLIDADO Y LIQUIDACIÓN COMERCIAL</Text>
        <SymbolView fallback={null} name={{ android: 'arrow_downward', ios: 'arrow.down', web: 'arrow_downward' }} size={18} tintColor={accent.emerald.pillInk} />
      </Pressable>

      <View onLayout={(event) => { tableY.current = event.nativeEvent.layout.y; }} style={s.card} testID="sheet-table">
        <View style={s.sectionHeader}>
          <View style={s.sectionTitleRow}>
            <View style={sheetLayout.bullet} />
            <Text accessibilityRole="header" style={s.sectionTitle}>Resultado de compra por variedad / lote</Text>
          </View>
          <Text style={s.help}>Cálculos automáticos acumulados</Text>
        </View>
        <View style={s.tableHead}>
          <Text style={[s.th, s.colLot]}>LOTE</Text>
          <Text style={[s.th, s.colVariety]}>VARIEDAD PAPA</Text>
          <Text style={[s.th, s.colSacks]}>N.° SACOS</Text>
          <Text style={[s.th, s.colWeight]}>PESO TOTAL (KG)</Text>
          <Text style={[s.th, s.colPrice]}>PRECIO / KG (S/)</Text>
          <Text style={[s.th, s.colAmount]}>SUBTOTAL (S/)</Text>
        </View>
        {props.lots.length ? props.lots.map((lot) => {
          const draftLot = values.lots[lot.key] ?? emptyLotDraft;
          const amount = preview.kind === 'ready' ? preview.lots.find((item) => item.key === lot.key)?.amountCents : previewLotAmount(lot, props.values.lots[lot.key]);
          const described = `${lot.varietyName}${lot.qualityName ? ` · ${lot.qualityName}` : ''}`;
          const current = lot.varietyId === active?.id;
          return (
            <View key={lot.key} style={[s.tableRow, current && sheetLayout.rowActive]} testID={`lot-${lot.letter}`}>
              <View style={s.colLot}><Pressable accessibilityLabel={`Ir al lote ${lot.letter}`} accessibilityRole="button" onPress={() => props.onSelectVariety(lot.varietyId)} style={[s.lotTag, !current && sheetLayout.lotTagIdle]}><Text style={[s.lotTagText, !current && sheetLayout.lotTagTextIdle]}>Lote {lot.letter}</Text></Pressable></View>
              <View style={s.colVariety}>
                <SheetInput accessibilityLabel={`Nombre del lote ${lot.letter} (opcional)`} editable={!locked} maxLength={60} onChangeText={(value) => props.onChangeLot(lot.key, 'name', value)} placeholder={described} style={s.tableInput} value={draftLot.name} />
              </View>
              <View style={s.colSacks}><View style={s.sacksPill}><Text style={s.sacksPillText}>{lot.sacks} {sackWord(lot.sacks)}</Text></View></View>
              <View style={s.colWeight}><View style={s.weightPill}><Text style={s.weightPillText}>{formatKilograms(lot.netWeightKg)}</Text></View></View>
              <View style={[s.colPrice, s.priceCell]}>
                <SheetInput accessibilityLabel={draftLot.priceBasis === 'kilogram' ? `Precio por kilogramo, lote ${lot.letter} (S/)` : `Precio por saco, lote ${lot.letter} (S/)`} editable={!locked} keyboardType="decimal-pad" onChangeText={(value) => props.onChangeLot(lot.key, 'unitPrice', value)} placeholder="0.00" style={[s.tableInput, s.priceInput]} value={draftLot.unitPrice} />
              </View>
              <Text accessibilityLabel={`Importe del lote ${lot.letter}: ${amount ? formatPreviewMoney(amount) : 'Pendiente'}`} style={[s.amount, s.colAmount]}>{amount ? formatPreviewMoney(amount) : 'Pendiente'}</Text>
            </View>
          );
        }) : null}
        {/* Varieties still without sacks, as the «0 sacos» row of the mockup. */}
        {props.varieties.filter((variety) => !props.lots.some((lot) => lot.varietyId === variety.id)).map((variety) => (
          <View key={`empty-${variety.id}`} style={s.tableRow} testID={`lot-empty-${variety.id}`}>
            <View style={s.colLot}><View style={[s.lotTag, sheetLayout.lotTagIdle]}><Text style={[s.lotTagText, sheetLayout.lotTagTextIdle]}>Sin sacos</Text></View></View>
            <View style={s.colVariety}><Text numberOfLines={1} style={sheetLayout.emptyVariety}>{variety.name}</Text></View>
            <View style={s.colSacks}><View style={s.sacksPill}><Text style={s.sacksPillText}>0 sacos</Text></View></View>
            <View style={s.colWeight}><View style={s.weightPill}><Text style={s.weightPillText}>0 kg</Text></View></View>
            <View style={[s.colPrice, s.priceCell]}><Text style={sheetLayout.emptyPrice}>Precio al pesar</Text></View>
            <Text accessibilityLabel={`${variety.name}: sin sacos, S/ 0.00`} style={[s.amount, s.colAmount]}>S/ 0.00</Text>
          </View>
        ))}
        {props.lots.length || props.varieties.length ? null : <Text style={s.empty}>Los lotes aparecen al registrar el primer saco.</Text>}
        <View style={sheetLayout.totals}>
          <BigTotal label="TOTAL SACOS ACOPIADOS:" unit="uds" value={`${totalSacks}`} />
          <BigTotal label="TOTAL KILAJE GENERAL:" unit="kg" value={formatKilograms(gramsToKg(totalGrams)).replace(' kg', '')} />
          <BigTotal accessibilityLabel={`Total compra: ${money('grossCents')}`} label="TOTAL COMPRA (S/):" strong value={money('grossCents')} />
        </View>
      </View>

      <View style={s.card} testID="sheet-freight">
        <View style={s.sectionHeader}>
          <View style={s.sectionTitleRow}>
            <SymbolView fallback={null} name={{ android: 'local_shipping', ios: 'truck.box', web: 'local_shipping' }} size={22} tintColor={color.brand} />
            <Text accessibilityRole="header" style={s.sectionTitle}>Flete de transporte (descuento / acopio)</Text>
          </View>
          <View accessibilityRole="radiogroup" style={sheetLayout.segment}>
            {([['sack', 'Por sacos'], ['kilogram', 'Por kilaje']] as const).map(([value, label]) => (
              <Pressable accessibilityLabel={`Flete: ${label.toLowerCase()}`} accessibilityRole="radio" accessibilityState={{ checked: basis === value }} disabled={locked} key={value} onPress={() => props.onChange('freightBasis', value)} style={[sheetLayout.segmentOption, basis === value && sheetLayout.segmentSelected]}>
                <Text style={[sheetLayout.segmentText, basis === value && s.onBrand]}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        {(
          <View style={s.freightRow}>
            <View style={s.freightChip}>
              <Text style={s.freightQuantity}>{basis === 'sack' ? `${totalSacks}` : formatKilograms(gramsToKg(totalGrams)).replace(' kg', '')}</Text>
              <Text style={sheetLayout.freightUnit}>{basis === 'sack' ? sackWord(totalSacks) : 'kg'}</Text>
              <Text style={s.freightTimes}>× S/</Text>
              <SheetInput accessibilityLabel="Tarifa de flete (S/)" editable={!locked} keyboardType="decimal-pad" onChangeText={(value) => props.onChange('freightRate', value)} placeholder="0.00" style={s.freightInput} value={values.freightRate} />
            </View>
            <Text style={[s.help, s.grow]}>{freightOn ? 'Tarifa por unidad seleccionada' : 'Tarifa 0: la compra va sin flete'}</Text>
            <Text style={sheetLayout.freightLabel}>SUBTOTAL FLETE:</Text>
            <Text accessibilityLabel={`Subtotal de flete: ${money('freightCents')}`} style={s.freightAmount}>{money('freightCents')}</Text>
          </View>
        )}
        <View style={sheetLayout.freightMore}>
          <View style={sheetLayout.vehicle}><SelectionField appearance="stitch" disabled={props.detailsLocked || locked} label="Vehículo (opcional)" leadingIcon="local_shipping" onPress={props.onSelectVehicle} placeholder="Seleccionar placa" value={props.details.vehiclePlate} /></View>
          {freightOn ? (
            <View style={sheetLayout.payer}>
              <Text style={sheetLayout.payerLabel}>¿QUIÉN ASUME EL FLETE?</Text>
              <View accessibilityRole="radiogroup" style={sheetLayout.segment}>
                {([['provider', 'Se descuenta al proveedor'], ['wholesaler', 'Lo paga el Mayorista']] as const).map(([value, label]) => (
                  <Pressable accessibilityLabel={label} accessibilityRole="radio" accessibilityState={{ checked: values.freightChargedTo === value }} disabled={locked} key={value} onPress={() => props.onChange('freightChargedTo', value)} style={[sheetLayout.segmentOption, values.freightChargedTo === value && sheetLayout.segmentSelected]}>
                    <Text style={[sheetLayout.segmentText, values.freightChargedTo === value && s.onBrand]}>{label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
        </View>
        {wholesalerFreight ? <Text style={s.help}>No se descuenta del proveedor; queda como flete pendiente con el transportista.</Text> : null}
      </View>

      <View style={s.card} testID="sheet-summary">
        <View style={[s.sectionHeader, sheetLayout.summaryHead]}>
          <View style={s.sectionTitleRow}>
            <SymbolView fallback={null} name={{ android: 'account_balance_wallet', ios: 'wallet.pass', web: 'account_balance_wallet' }} size={22} tintColor={color.brand} />
            <Text accessibilityRole="header" style={s.sectionTitle}>Resumen de liquidación</Text>
          </View>
          <Text style={s.balance}>BALANCE COMERCIAL</Text>
        </View>
        <View style={sheetLayout.summary}>
          <View style={sheetLayout.summaryLeft}>
            <Line label="Total pago (producto):" value={money('grossCents')} />
            <Line label={wholesalerFreight ? 'Flete a cargo del Mayorista (no se descuenta)' : 'Total flete (descuento):'} value={!freightOn ? 'S/ 0.00' : wholesalerFreight || preview.kind !== 'ready' ? money('freightCents') : `- ${money('freightCents')}`} />
            <View style={sheetLayout.line}>
              <Text style={sheetLayout.lineLabel}>Otros cargos / ajustes:</Text>
              <Text style={sheetLayout.currency}>S/</Text>
              <SheetInput accessibilityLabel="Otros descuentos (S/)" editable={!locked} keyboardType="decimal-pad" onChangeText={(value) => props.onChange('discounts', value)} placeholder="0.00" style={sheetLayout.lineInput} value={values.discounts} />
            </View>
          </View>
          <View style={sheetLayout.summaryRight}>
            <View style={sheetLayout.advance}>
              <Text style={sheetLayout.payerLabel}>ADELANTO ENTREGADO:</Text>
              <Text style={sheetLayout.currency}>S/</Text>
              <SheetInput accessibilityLabel="Adelantos (S/)" editable={!locked} keyboardType="decimal-pad" onChangeText={(value) => props.onChange('advances', value)} placeholder="0.00" style={sheetLayout.lineInput} value={values.advances} />
            </View>
            <View style={sheetLayout.net}>
              <View>
                <Text style={sheetLayout.netTitle}>TOTAL NETO A LIQUIDAR</Text>
                <Text style={sheetLayout.netHelp}>{values.paymentMode === 'cash' ? 'Saldo a pagar en mano' : 'Saldo a crédito, en cuotas'}</Text>
              </View>
              <Text accessibilityLabel={`Total neto a liquidar: ${money('liquidCents')}`} style={sheetLayout.netValue}>{money('liquidCents')}</Text>
            </View>
            <View style={sheetLayout.payment}>
              <Text style={sheetLayout.payerLabel}>FORMA DE PAGO</Text>
              <View accessibilityRole="radiogroup" style={sheetLayout.segment}>
                {([['cash', 'Contado'], ['credit', 'Crédito']] as const).map(([value, label]) => (
                  <Pressable accessibilityLabel={label} accessibilityRole="radio" accessibilityState={{ checked: values.paymentMode === value }} disabled={locked} key={value} onPress={() => props.onChange('paymentMode', value)} style={[sheetLayout.segmentOption, values.paymentMode === value && sheetLayout.segmentSelected]}>
                    <Text style={[sheetLayout.segmentText, values.paymentMode === value && s.onBrand]}>{label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </View>
        {values.paymentMode === 'credit' ? <InstallmentRows busy={locked} installments={values.installments} onAdd={props.onAddInstallment} onChange={props.onChangeInstallment} onRemove={props.onRemoveInstallment} /> : null}
        {preview.kind !== 'ready' && props.sacks.length ? <FeedbackState title={preview.kind === 'invalid' ? 'Revisa la liquidación' : 'Importes pendientes'} message={preview.message} tone={preview.kind === 'invalid' ? 'error' : undefined} /> : null}
        <Text style={s.help}>Importes provisionales: el servidor los verifica al guardar y registra la compra, el flete y la caja o la cuenta por pagar.</Text>
      </View>

      <View style={s.actions}>
        {props.onClear ? (
          <Pressable accessibilityLabel="Limpiar registro" accessibilityRole="button" disabled={locked} onPress={props.onClear} style={({ pressed }) => [s.clear, (pressed || locked) && s.dimmed]}>
            <SymbolView fallback={null} name={{ android: 'restart_alt', ios: 'arrow.counterclockwise', web: 'restart_alt' }} size={22} tintColor={color.brand} />
            <Text style={s.clearText}>Limpiar registro</Text>
          </Pressable>
        ) : null}
        <Pressable accessibilityLabel="Guardar compra" accessibilityRole="button" disabled={!canSave} onPress={props.onSave} style={({ pressed }) => [s.save, (pressed || !canSave) && s.dimmed]} testID="save-purchase">
          <SymbolView fallback={null} name={{ android: 'check_circle', ios: 'checkmark.circle', web: 'check_circle' }} size={22} tintColor="#6EE7B7" />
          <Text style={s.saveText}>{props.busy ? 'Guardando…' : 'Guardar compra'}</Text>
        </Pressable>
      </View>

      {dateOpen ? <DateDialog onCancel={() => setDateOpen(false)} onPick={(value) => { setDateOpen(false); props.onChangeDetail('date', value); }} title="Fecha de acopio" value={props.details.date} visible /> : null}
      <Modal animationType="fade" onRequestClose={() => setCharacteristicsOpen(false)} transparent visible={characteristicsOpen}>
        <View style={sheetLayout.modalBackdrop}>
          <View style={sheetLayout.modal}>
            <Text accessibilityRole="header" style={s.sectionTitle}>Calidad y procedencia de los próximos sacos</Text>
            {props.characteristics}
            <Pressable accessibilityLabel="Listo" accessibilityRole="button" onPress={() => setCharacteristicsOpen(false)} style={[s.save, sheetLayout.modalDone]}><Text style={s.saveText}>Listo</Text></Pressable>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

export function BigTotal({ accessibilityLabel, label, strong = false, unit, value }: { accessibilityLabel?: string; label: string; strong?: boolean; unit?: string; value: string }) {
  return (
    <View accessibilityLabel={accessibilityLabel ?? `${label} ${value}${unit ? ` ${unit}` : ''}`} accessible style={[sheetLayout.bigTotal, strong && sheetLayout.bigTotalStrong]}>
      <Text style={[sheetLayout.bigTotalLabel, strong && sheetLayout.bigTotalLabelStrong]}>{label}</Text>
      <View style={sheetLayout.bigTotalValueLine}>
        <Text style={[sheetLayout.bigTotalValue, strong && sheetLayout.bigTotalValueStrong]}>{value}</Text>
        {unit ? <Text style={sheetLayout.bigTotalUnit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

export function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={sheetLayout.line}>
      <Text style={sheetLayout.lineLabel}>{label}</Text>
      <View style={sheetLayout.lineValueBox}><Text accessibilityLabel={`${label.replace(/:$/, "")}: ${value}`} style={sheetLayout.lineValue}>{value}</Text></View>
    </View>
  );
}

// Styles of the purchase sheet that the sale sheet does not share.
export const sheetLayout = StyleSheet.create({
  details: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  detailWide: { flexBasis: 360, flexGrow: 2, minWidth: 0 },
  detail: { flexBasis: 170, flexGrow: 1, minWidth: 0 },
  tabsLinks: { marginRight: 8 },
  emptyVariety: { color: '#475569', fontSize: 15, fontWeight: '600', paddingHorizontal: 12 },
  emptyPrice: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  quality: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2 },
  qualityText: { color: color.textOnBrand, fontSize: 12, fontWeight: '600' },
  edit: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, height: 32, justifyContent: 'center', width: 32 },
  lotEnd: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  remove: { alignItems: 'center', flexDirection: 'row', gap: 4, minHeight: 40, paddingHorizontal: 8 },
  removeText: { color: color.danger, fontSize: 13, fontWeight: '600' },
  gridTitle: { alignItems: 'center', flexDirection: 'row', flexShrink: 1, flexWrap: 'wrap', gap: 6 },
  gridHint: { color: '#74777F', fontSize: 12, fontWeight: '500' },
  goToInput: { fontSize: 13, minHeight: 40, textAlign: 'center', width: 120 },
  goToButton: { alignItems: 'center', backgroundColor: '#EFF4FF', borderRadius: 10, height: 40, justifyContent: 'center', width: 44 },
  cellDraft: { borderColor: '#10B981', borderStyle: 'dashed', borderWidth: 1.5 },
  clear: { alignItems: 'center', height: 24, justifyContent: 'center', width: 22 },
  clearIdle: {},
  suggestions: { backgroundColor: '#FFFFFF', borderColor: '#D3E4FE', borderRadius: 10, borderWidth: 1, marginTop: 6, overflow: 'hidden' },
  suggestion: { alignItems: 'center', borderBottomColor: '#EFF4FF', borderBottomWidth: 1, flexDirection: 'row', gap: 8, minHeight: 44, paddingHorizontal: 12 },
  suggestionText: { color: '#0B1C30', flexShrink: 1, fontSize: 14, fontWeight: '600' },
  suggestionHint: { color: '#727974', fontSize: 12, marginLeft: 'auto' },
  providerNotice: { color: '#424844', flexBasis: '100%', fontSize: 12 },
  cellBlank: { backgroundColor: '#F8F9FF', borderColor: '#CBD5E1', borderStyle: 'dashed', borderWidth: 1 },
  cellNumberBlank: { backgroundColor: '#E2E8F0' },
  cellNumberBlankText: { color: '#64748B' },
  cellBlankText: { color: '#94A3B8', fontSize: 16, fontWeight: '600' },
  quickLoad: { alignItems: 'center', backgroundColor: 'rgba(209,250,229,0.4)', borderColor: 'rgba(4,120,87,0.4)', borderRadius: 12, borderWidth: 1, flexBasis: 280, flexDirection: 'row', flexGrow: 1, gap: 8, justifyContent: 'center', minHeight: 48, paddingHorizontal: 14 },
  quickLoadText: { color: accent.emerald.pillInk, fontSize: 14, fontWeight: '700' },
  dateField: { gap: 6 },
  dateLabel: { color: '#64748B', fontSize: 12, fontWeight: '600', letterSpacing: 0.8, lineHeight: 16 },
  dateControl: { alignItems: 'center', backgroundColor: '#EFF4FF', borderRadius: 12, flexDirection: 'row', gap: 10, minHeight: 44, paddingHorizontal: 13 },
  dateValue: { color: '#0B1C30', fontSize: 14, fontWeight: '500' },
  dateValueLocked: { color: '#475569' },
  cellNumberDraft: { backgroundColor: '#047857' },
  cellInput: { flex: 1, fontSize: 16, fontWeight: '800', minHeight: 34, paddingHorizontal: 8, paddingVertical: 2, textAlign: 'right' },
  addRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  addSack: { alignItems: 'center', backgroundColor: '#EFF4FF', borderColor: 'rgba(4,120,87,0.4)', borderRadius: 12, borderStyle: 'dashed', borderWidth: 2, flexBasis: 300, flexDirection: 'row', flexGrow: 1, gap: 8, justifyContent: 'center', minHeight: 48, paddingHorizontal: 12 },
  addSackText: { color: accent.emerald.ink, fontSize: 14, fontWeight: '700' },
  tareBox: { alignItems: 'center', backgroundColor: 'rgba(209,250,229,0.4)', borderColor: 'rgba(4,120,87,0.4)', borderRadius: 12, borderWidth: 1, flexBasis: 300, flexDirection: 'row', flexGrow: 1, gap: 8, justifyContent: 'center', minHeight: 48, paddingHorizontal: 12 },
  tareLabel: { color: accent.emerald.pillInk, fontSize: 14, fontWeight: '700' },
  tareInput: { fontSize: 15, fontWeight: '800', minHeight: 36, paddingVertical: 2, textAlign: 'right', width: 72 },
  tareUnit: { color: accent.emerald.pillInk, fontSize: 12, fontWeight: '600' },
  cancel: { justifyContent: 'center', minHeight: 40, paddingHorizontal: 8 },
  cancelText: { color: color.brand, fontSize: 14, fontWeight: '700' },
  subtotal: { alignItems: 'center', backgroundColor: '#EFF4FF', borderColor: '#E2E8F0', borderRadius: 12, borderWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', padding: 16 },
  kgUnit: { color: '#74777F', fontSize: 12, fontWeight: '700' },
  jump: { alignItems: 'center', backgroundColor: 'rgba(160,243,203,0.6)', borderRadius: 12, flexDirection: 'row', gap: 8, justifyContent: 'center', minHeight: 44, paddingHorizontal: 16 },
  jumpText: { color: accent.emerald.pillInk, fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
  bullet: { backgroundColor: '#0B2A1F', borderRadius: 999, height: 8, width: 8 },
  rowActive: { backgroundColor: '#EFF4FF', borderColor: '#9FB7D9', borderWidth: 1.5 },
  lotTagIdle: { backgroundColor: '#E2E8F0' },
  lotTagTextIdle: { color: '#1E293B' },
  basis: { flexDirection: 'row', gap: 2 },
  basisOption: { alignItems: 'center', borderRadius: 6, justifyContent: 'center', minHeight: 32, minWidth: 40, paddingHorizontal: 4 },
  basisText: { color: '#475569', fontSize: 11, fontWeight: '700' },
  totals: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  bigTotal: { alignItems: 'center', backgroundColor: '#EFF4FF', borderColor: '#E2E8F0', borderRadius: 12, borderWidth: 1, flexBasis: 240, flexDirection: 'row', flexGrow: 1, justifyContent: 'space-between', minHeight: 60, paddingHorizontal: 16 },
  bigTotalStrong: { backgroundColor: 'rgba(160,243,203,0.6)', borderColor: '#6EE7B7' },
  bigTotalLabel: { color: '#475569', fontSize: 11, fontWeight: '600', letterSpacing: 0.6 },
  bigTotalLabelStrong: { color: accent.emerald.pillInk },
  bigTotalValueLine: { alignItems: 'baseline', flexDirection: 'row', gap: 4 },
  bigTotalValue: { color: '#0F172A', fontSize: 20, fontWeight: '700' },
  bigTotalValueStrong: { color: accent.emerald.pillInk, fontSize: 21, fontWeight: '800' },
  bigTotalUnit: { color: '#74777F', fontSize: 11 },
  segment: { backgroundColor: '#E5EEFF', borderRadius: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 2, padding: 3 },
  segmentOption: { alignItems: 'center', borderRadius: 8, justifyContent: 'center', minHeight: 36, paddingHorizontal: 12 },
  segmentSelected: { backgroundColor: '#0B2A1F' },
  segmentText: { color: '#475569', fontSize: 12, fontWeight: '700' },
  freightUnit: { color: '#C4DBCD', fontSize: 12, fontWeight: '600' },
  freightLabel: { color: '#74777F', fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  freightMore: { alignItems: 'flex-end', flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  vehicle: { flexBasis: 260, flexGrow: 1 },
  payer: { flexGrow: 1, gap: 6 },
  payerLabel: { color: '#74777F', fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  summaryHead: { borderBottomColor: '#EFF4FF', borderBottomWidth: 1, paddingBottom: 12 },
  summary: { flexDirection: 'row', flexWrap: 'wrap', gap: 24 },
  summaryLeft: { flexBasis: 320, flexGrow: 1, gap: 10 },
  summaryRight: { borderLeftColor: '#EFF4FF', borderLeftWidth: 1, flexBasis: 320, flexGrow: 1, gap: 10, paddingLeft: 24 },
  line: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'space-between', minHeight: 40 },
  lineLabel: { color: '#334155', flex: 1, fontSize: 14, fontWeight: '500' },
  lineValueBox: { backgroundColor: '#EFF4FF', borderRadius: 8, minWidth: 140, paddingHorizontal: 12, paddingVertical: 6 },
  lineValue: { color: '#0F172A', fontSize: 15, fontWeight: '700', textAlign: 'right' },
  currency: { color: '#74777F', fontSize: 12, fontWeight: '600' },
  lineInput: { fontSize: 15, fontWeight: '700', minHeight: 36, paddingVertical: 4, textAlign: 'right', width: 140 },
  advance: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  net: { alignItems: 'center', backgroundColor: '#0B2A1F', borderRadius: 12, boxShadow: '0px 4px 6px rgba(15,23,42,0.2)', flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', padding: 16 },
  netTitle: { color: '#6EE7B7', fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
  netHelp: { color: '#C4DBCD', fontSize: 12 },
  netValue: { color: color.textOnBrand, fontSize: 28, fontWeight: '800' },
  payment: { gap: 6 },
  modalBackdrop: { alignItems: 'center', backgroundColor: 'rgba(15,23,42,0.45)', flex: 1, justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: color.surfaceRaised, borderRadius: 20, gap: 16, maxWidth: 640, padding: 24, width: '100%' },
  modalDone: { alignSelf: 'flex-end' },
});

export function gramsToKg(grams: bigint) {
  return `${grams / 1000n}.${(grams % 1000n).toString().padStart(3, '0')}`;
}

// Text input of the sheet: registers with the screen so the keyboard never
// covers it, like FormField.
export function SheetInput({ onFocus, ref: outerRef, style, ...props }: TextInputProps & { ref?: Ref<TextInput> }) {
  const ref = useRef<TextInput>(null);
  const keyboard = useContext(KeyboardFocusContext);
  return (
    <TextInput
      onFocus={(event) => {
        keyboard?.focus(ref.current);
        onFocus?.(event);
      }}
      placeholderTextColor="#64748B"
      ref={(node) => {
        ref.current = node;
        if (typeof outerRef === 'function') outerRef(node);
        else if (outerRef) outerRef.current = node;
      }}
      selectTextOnFocus
      style={[sheetStyles.input, props.editable === false && sheetStyles.inputDisabled, style]}
      {...props}
    />
  );
}

export function Option({ accessibilityLabel, checked, disabled, label, onPress }: { accessibilityLabel?: string; checked: boolean; disabled?: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityLabel={accessibilityLabel ?? label} accessibilityRole="radio" accessibilityState={{ checked }} disabled={disabled} onPress={onPress} style={[sheetStyles.option, checked && sheetStyles.optionChecked]}>
      <Text style={[sheetStyles.optionText, checked && sheetStyles.onBrand]}>{label}</Text>
    </Pressable>
  );
}

export function Total({ label, strong, value }: { label: string; strong?: boolean; value: string }) {
  return (
    <View style={[sheetStyles.total, strong && sheetStyles.totalStrong]}>
      <Text style={[sheetStyles.totalLabel, strong && sheetStyles.onBrand]}>{label}:</Text>
      <Text accessibilityLabel={`${label}: ${value}`} style={[sheetStyles.totalValue, strong && sheetStyles.onBrand]}>{value}</Text>
    </View>
  );
}

export function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={sheetStyles.summaryLine}>
      <Text style={sheetStyles.summaryLabel}>{label}</Text>
      <Text accessibilityLabel={`${label}: ${value}`} style={sheetStyles.summaryValue}>{value}</Text>
    </View>
  );
}

const line = '#E2E8F0';
const soft = '#F1F5F9';

export const sheetStyles = StyleSheet.create({
  screen: { gap: spacing.md, maxWidth: 1280, paddingBottom: spacing.xl, paddingTop: spacing.sm },
  card: { backgroundColor: color.surfaceRaised, borderColor: line, borderRadius: radius.lg, borderWidth: 1, boxShadow: '0px 1px 2px rgba(15,23,42,0.06)', gap: spacing.md, padding: spacing.md },
  fields: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  field: { flexBasis: 180, flexGrow: 1 },
  fieldWide: { flexBasis: 320, flexGrow: 2 },
  help: { color: color.textSecondary, fontSize: 14, lineHeight: 20 },
  grow: { flex: 1 },
  dimmed: { opacity: 0.5 },
  onBrand: { color: color.textOnBrand },

  tabsCard: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tabs: { alignItems: 'center', flexDirection: 'row', flexGrow: 1, flexShrink: 1, flexWrap: 'wrap', gap: 10 },
  tab: { alignItems: 'center', backgroundColor: soft, borderColor: line, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, minHeight: 48, paddingHorizontal: spacing.md },
  tabSelected: { backgroundColor: color.brand, borderColor: color.brand, boxShadow: '0px 0px 0px 2px rgba(31,58,47,0.2)' },
  tabLetter: { alignItems: 'center', backgroundColor: color.brandMuted, borderRadius: 6, height: 24, justifyContent: 'center', width: 24 },
  tabLetterSelected: { backgroundColor: accent.emerald.ink },
  tabLetterText: { color: color.brand, fontSize: 13, fontWeight: '800' },
  tabName: { color: color.textPrimary, fontSize: 15, fontWeight: '700', maxWidth: 180 },
  tabCount: { backgroundColor: color.brandMuted, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  tabCountSelected: { backgroundColor: 'rgba(255,255,255,0.2)' },
  tabCountText: { color: color.textSecondary, fontSize: 13, fontWeight: '700' },
  addLot: { alignItems: 'center', backgroundColor: accent.emerald.ink, borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, minHeight: 48, paddingHorizontal: spacing.md },
  addLotText: { color: color.textOnBrand, fontSize: 15, fontWeight: '700' },

  lotHeader: { alignItems: 'center', borderBottomColor: line, borderBottomWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between', paddingBottom: 12 },
  lotChip: { alignItems: 'center', backgroundColor: color.brand, borderRadius: radius.md, flexDirection: 'row', gap: 10, minHeight: 44, paddingHorizontal: spacing.md },
  lotChipText: { color: color.textOnBrand, fontSize: 16, fontWeight: '700', maxWidth: 360 },
  lotBadge: { backgroundColor: accent.emerald.pill, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  lotBadgeText: { color: accent.emerald.pillInk, fontSize: 13, fontWeight: '700' },
  gridHeader: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' },
  gridTitles: { flexShrink: 1, gap: 2 },
  overline: { color: color.textSecondary, fontSize: 13, fontWeight: '700', letterSpacing: 0.8 },
  goTo: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  goToInput: { minHeight: 44, textAlign: 'center', width: 140 },
  goToButton: { alignItems: 'center', backgroundColor: color.surfaceRaised, borderColor: color.brand, borderRadius: radius.sm, borderWidth: 1, justifyContent: 'center', minHeight: 44, minWidth: 48, paddingHorizontal: spacing.sm },
  goToButtonText: { color: color.brand, fontSize: 15, fontWeight: '700' },
  countBadge: { backgroundColor: accent.emerald.tint, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 6 },
  countBadgeText: { color: accent.emerald.ink, fontSize: 13, fontWeight: '700' },
  targetMessage: { color: color.danger, fontSize: 14, fontWeight: '600' },
  gridBox: { backgroundColor: '#F8FAFC', borderColor: line, borderRadius: radius.md, borderWidth: 1, padding: 4 },
  grid: { maxHeight: gridMaxHeight },
  gridRow: { flexDirection: 'row', gap: spacing.sm, height: sheetRowHeight, paddingHorizontal: 4, paddingVertical: 4 },
  cell: { alignItems: 'center', backgroundColor: soft, borderColor: line, borderRadius: radius.md, borderWidth: 1, flex: 1, flexDirection: 'row', gap: 6, paddingHorizontal: spacing.sm },
  cellGap: { opacity: 0 },
  cellHighlighted: { backgroundColor: accent.emerald.tint, borderColor: color.successAccent },
  cellNumber: { alignItems: 'center', backgroundColor: color.brand, borderRadius: 6, height: 28, justifyContent: 'center', minWidth: 28, paddingHorizontal: 4 },
  cellNumberText: { color: color.textOnBrand, fontSize: 12, fontVariant: ['tabular-nums'], fontWeight: '700' },
  cellValue: { alignItems: 'flex-end', backgroundColor: color.surfaceRaised, borderColor: '#CBD5E1', borderRadius: 6, borderWidth: 1, flex: 1, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  cellValueText: { color: color.brand, fontSize: 16, fontVariant: ['tabular-nums'], fontWeight: '800' },
  cellUnit: { color: color.textSecondary, fontSize: 12, fontWeight: '600' },
  empty: { color: color.textSecondary, fontSize: 15, lineHeight: 22, padding: spacing.md },

  capture: { borderColor: '#94A3B8', borderRadius: radius.md, borderStyle: 'dashed', borderWidth: 2, gap: spacing.sm, padding: 12 },
  captureRow: { alignItems: 'flex-end', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  captureTitle: { color: color.textPrimary, fontSize: 18, fontWeight: '800', minWidth: 120, paddingBottom: 12 },
  captureField: { gap: 4 },
  captureLabel: { color: color.textPrimary, fontSize: 14, fontWeight: '700' },
  captureInput: { fontSize: 20, fontWeight: '800', minHeight: 48, textAlign: 'right', width: 150 },
  addSack: { alignItems: 'center', backgroundColor: accent.emerald.pill, borderColor: accent.emerald.line, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, minHeight: 48, paddingHorizontal: spacing.lg },
  addSackText: { color: accent.emerald.pillInk, fontSize: 16, fontWeight: '800' },
  cancelEdit: { justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.sm },
  cancelEditText: { color: color.brand, fontSize: 15, fontWeight: '700' },

  subtotal: { alignItems: 'center', backgroundColor: '#EEF2FF', borderRadius: radius.md, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: 12 },
  subtotalCopy: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  subtotalTitle: { color: color.textPrimary, fontSize: 14, fontWeight: '800', letterSpacing: 0.6 },
  subtotalWeight: { alignItems: 'baseline', flexDirection: 'row', gap: spacing.sm },
  subtotalValue: { color: color.brand, fontSize: 26, fontVariant: ['tabular-nums'], fontWeight: '800' },

  sectionHeader: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' },
  sectionTitleRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  sectionTitle: { color: color.textPrimary, fontSize: 18, fontWeight: '700' },
  tableHead: { borderBottomColor: line, borderBottomWidth: 1, borderTopColor: line, borderTopWidth: 1, flexDirection: 'row', gap: spacing.sm, paddingVertical: 10 },
  th: { color: color.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
  tableRow: { alignItems: 'center', backgroundColor: '#F8FAFC', borderColor: line, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, minHeight: 60, paddingVertical: 6 },
  colLot: { paddingLeft: spacing.sm, width: 84 },
  colVariety: { flex: 1.6, minWidth: 0 },
  colSacks: { alignItems: 'center', textAlign: 'center', width: 110 },
  colWeight: { alignItems: 'center', textAlign: 'center', width: 150 },
  colPrice: { width: 220 },
  colAmount: { paddingRight: spacing.md, textAlign: 'right', width: 150 },
  lotTag: { alignSelf: 'flex-start', backgroundColor: accent.emerald.ink, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  lotTagText: { color: color.textOnBrand, fontSize: 13, fontWeight: '800' },
  tableInput: { minHeight: 44 },
  sacksPill: { backgroundColor: color.surfaceRaised, borderColor: line, borderRadius: radius.sm, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  sacksPillText: { color: color.textPrimary, fontSize: 15, fontWeight: '700' },
  weightPill: { alignItems: 'center', alignSelf: 'stretch', backgroundColor: color.brand, borderRadius: radius.sm, paddingVertical: 8 },
  weightPillText: { color: color.textOnBrand, fontSize: 16, fontVariant: ['tabular-nums'], fontWeight: '800' },
  priceCell: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  basis: { backgroundColor: line, borderRadius: radius.sm, flexDirection: 'row', padding: 2 },
  basisOption: { alignItems: 'center', borderRadius: 6, justifyContent: 'center', minHeight: 40, minWidth: 46, paddingHorizontal: 6 },
  basisSelected: { backgroundColor: color.brand },
  basisText: { color: color.textPrimary, fontSize: 14, fontWeight: '700' },
  priceInput: { flex: 1, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  amount: { color: color.textPrimary, fontSize: 18, fontVariant: ['tabular-nums'], fontWeight: '800' },
  totals: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'flex-end' },
  total: { alignItems: 'center', backgroundColor: soft, borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 10 },
  totalStrong: { backgroundColor: color.brand },
  totalLabel: { color: color.textSecondary, fontSize: 14, fontWeight: '600' },
  totalValue: { color: color.textPrimary, fontSize: 18, fontVariant: ['tabular-nums'], fontWeight: '800' },

  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: { alignItems: 'center', backgroundColor: color.surfaceRaised, borderColor: color.brand, borderRadius: radius.md, borderWidth: 1, justifyContent: 'center', minHeight: 44, paddingHorizontal: spacing.md },
  optionChecked: { backgroundColor: color.brand },
  optionText: { color: color.brand, fontSize: 15, fontWeight: '700' },
  freightRow: { alignItems: 'center', backgroundColor: '#EEF2FF', borderRadius: radius.md, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: 12 },
  freightChip: { alignItems: 'center', backgroundColor: color.brand, borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, paddingHorizontal: 12, paddingVertical: 6 },
  freightQuantity: { color: color.textOnBrand, fontSize: 18, fontWeight: '800' },
  freightTimes: { color: '#6EE7B7', fontSize: 16, fontWeight: '700' },
  freightInput: { fontSize: 17, fontWeight: '800', minHeight: 44, textAlign: 'center', width: 110 },
  freightAmount: { color: color.textPrimary, fontSize: 22, fontVariant: ['tabular-nums'], fontWeight: '800' },

  balance: { color: accent.emerald.ink, fontSize: 13, fontWeight: '800', letterSpacing: 0.8 },
  summaryLine: { alignItems: 'center', borderBottomColor: soft, borderBottomWidth: 1, flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between', minHeight: 48 },
  summaryLabel: { color: color.textPrimary, flexShrink: 1, fontSize: 16, fontWeight: '600' },
  summaryValue: { color: color.textPrimary, fontSize: 18, fontVariant: ['tabular-nums'], fontWeight: '800' },
  summaryInput: { fontSize: 17, fontWeight: '800', minHeight: 44, textAlign: 'right', width: 160 },
  net: { alignItems: 'center', backgroundColor: color.brand, borderRadius: radius.md, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'space-between', padding: spacing.md },
  netTitle: { color: color.textOnBrand, fontSize: 18, fontWeight: '800' },
  netHelp: { color: color.brandMuted, fontSize: 14 },
  netValue: { color: color.textOnBrand, fontSize: 30, fontVariant: ['tabular-nums'], fontWeight: '800' },

  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'flex-end' },
  clear: { alignItems: 'center', backgroundColor: '#DBEAFE', borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, minHeight: 56, paddingHorizontal: spacing.lg },
  clearText: { color: color.brand, fontSize: 17, fontWeight: '700' },
  save: { alignItems: 'center', backgroundColor: color.brand, borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, minHeight: 56, paddingHorizontal: spacing.xl },
  saveText: { color: color.textOnBrand, fontSize: 18, fontWeight: '800' },

  input: { backgroundColor: color.surfaceRaised, borderColor: '#CBD5E1', borderRadius: radius.sm, borderWidth: 1, color: color.textPrimary, fontSize: 16, paddingHorizontal: 12, paddingVertical: 8 },
  inputDisabled: { backgroundColor: soft, color: color.textSecondary },
});

const s = sheetStyles;
