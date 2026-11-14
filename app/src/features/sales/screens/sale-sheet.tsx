import { SymbolView } from '@/ui/components/symbol';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, View, type TextInput } from 'react-native';

import { formatMoney } from '@/domain/reception/reception';
import type { SalePreview } from '@/domain/sales/sale-preview';
import { saleLineGrams, validSackWeight, type SaleLineDraft } from '@/domain/sales/sale';
import { BigTotal, gramsToKg, Line, sheetColumns, sheetLayout as p, sheetRowHeight, SheetInput, sheetStyles as s } from '@/features/reception/screens/purchase-sheet';
import type { InstallmentDraft } from '@/features/reception/screens/settlement-screen';
import { AppScreen, ConfirmationDialog, FeedbackState, FormField, SelectionField } from '@/ui/components';
import { DateDialog } from '@/features/sales/components/date-dialog';
import { InstallmentRows } from '@/features/reception/components/installment-rows';
import { useBottomNav } from '@/ui/navigation/app-chrome';
import { AppHeader } from '@/ui/navigation/app-header';
import { accent, color } from '@/ui/tokens';
import { formatKilograms } from '@/domain/reception/whole-kilograms';

const gridVisibleRows = 7;
const gridOverscan = 4;
const letter = (index: number) => String.fromCharCode(65 + index);
const sackWord = (count: number) => (count === 1 ? 'saco' : 'sacos');

export type SaleSheetProps = {
  errorMessage?: string;
  notice?: ReactNode;
  busy?: boolean;
  // Buyer and dispatch.
  // Buyer typed in its boxes (CL-ST23): matches of the catalog under the name.
  buyerName: string;
  onBuyerNameChange: (value: string) => void;
  buyerSuggestions: { id: string; label: string; supportingText?: string }[];
  onPickBuyer: (id: string) => void;
  buyerNotice?: string;
  buyerPhone: string;
  onBuyerPhoneChange: (value: string) => void;
  phoneEditable: boolean;
  buyerDocument: string;
  onBuyerDocumentChange: (value: string) => void;
  dispatchDate: string;
  onDispatchDateChange: (value: string) => void;
  destination: string;
  onDestinationChange: (value: string) => void;
  vehiclePlate?: string;
  driver: string;
  onDriverChange: (value: string) => void;
  onSelectVehicle: () => void;
  // Quality and origin of the active lot.
  lotCharacteristics?: ReactNode;
  // Lots: one per variety, quality and origin.
  lines: SaleLineDraft[];
  lineName: (line: SaleLineDraft) => string;
  activeLineId: string | null;
  onSelectLine: (id: string) => void;
  onAddLot: () => void;
  // ✎ of the lot chip: variety, quality, origin and price (CL-ST23).
  onEditLot?: () => void;
  onRemoveLot?: (id: string) => void;
  // Cells of the lot (CL-ST22): typed weights or empty.
  onChangeSlots: (id: string, slots: string[]) => void;
  onChangeLine: (id: string, field: 'priceBasis' | 'unitPrice', value: string) => void;
  // Settlement.
  preview: SalePreview;
  freightBasis: 'none' | 'kilogram' | 'sack';
  freightRate: string;
  freightIncluded: boolean;
  discounts: string;
  paymentMode: 'cash' | 'credit';
  installments: InstallmentDraft[];
  onChange: (field: 'freightBasis' | 'freightRate' | 'freightIncluded' | 'discounts' | 'paymentMode', value: string) => void;
  onAddInstallment: () => void;
  onChangeInstallment: (id: string, field: 'amount' | 'dueOn', value: string) => void;
  onRemoveInstallment: (id: string) => void;
  onClear: () => void;
  onSave: () => void;
  onBack: () => void;
  onGoHome: () => void;
};

type Cell = { index: number; value: string };
const quickLoad = 10;
const quickWeight = '50';

// Venta on one screen (spec 011, RQ-ST14, CL-ST18, CL-ST19, CL-ST22): the
// Stitch «Registro de venta multilotes» layout. Buyer data in one row, one tab
// per lot, numbered cells of the lot (the weighed ones dark, the empty ones
// with 0.0), «+ Añadir 1 saco», the subtotal, the consolidated table with the
// price of each lot, freight, the summary in two columns and «Guardar venta».
// Each lot is sent as one line with its sacks and the sum of their weights.
export function SaleSheet(props: SaleSheetProps) {
  const { preview } = props;
  const screenRef = useRef<ScrollView>(null);
  const tableY = useRef(0);
  const gridRef = useRef<ScrollView>(null);
  const [firstRow, setFirstRow] = useState(0);
  const [characteristicsOpen, setCharacteristicsOpen] = useState(false);
  // «Quitar lote» of the mockup asks before dropping weighed sacks.
  const [removeAsked, setRemoveAsked] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  // ✓ of the keyboard moves on: name → RUC / DNI → celular → first cell →
  // next cell; the last cell closes the keyboard (CL-ST25).
  const documentRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const cellRefs = useRef(new Map<number, TextInput>());
  const busy = Boolean(props.busy);
  const activeIndex = Math.max(0, props.lines.findIndex((line) => line.id === props.activeLineId));
  const active = props.lines[activeIndex];
  const weights = useMemo(() => active?.weights ?? [], [active]);
  // The cells of the lot; a lot made before the cells existed shows its sacks.
  const slots = useMemo(() => active?.slots ?? active?.weights ?? [], [active]);
  // As in the mockup, a lot keeps at least ten cells; extra ones can go away.
  const planned = quickLoad;
  const cells = useMemo<Cell[]>(() => slots.map((value, index) => ({ index, value })), [slots]);
  const rows = useMemo(() => {
    const chunks: Cell[][] = [];
    for (let index = 0; index < cells.length; index += sheetColumns) chunks.push(cells.slice(index, index + sheetColumns));
    return chunks;
  }, [cells]);
  const windowStart = Math.max(0, Math.min(firstRow, Math.max(0, rows.length - gridVisibleRows)) - gridOverscan);
  const windowEnd = Math.min(rows.length, windowStart + gridVisibleRows + gridOverscan * 2);
  const totalSacks = props.lines.reduce((total, line) => total + (line.weights?.length ?? 0), 0);
  const totalGrams = props.lines.reduce((total, line) => total + saleLineGrams(line), 0n);
  const money = (field: 'grossCents' | 'freightCents' | 'discountsCents' | 'totalCents') => (preview.kind === 'ready' ? formatMoney(preview[field]) : 'Pendiente');
  const canSave = !busy && totalSacks > 0 && preview.kind === 'ready';

  useBottomNav({
    back: { label: 'Atrás', disabled: busy, onPress: props.onBack },
    home: { label: 'Menú principal', disabled: busy, onPress: props.onGoHome },
    next: { label: busy ? 'Guardando…' : 'Guardar venta', disabled: !canSave, onPress: props.onSave },
  });

  function setSlots(next: string[]) {
    if (active) props.onChangeSlots(active.id, next);
  }
  // Only whole kilograms are kept while typing.
  function typeSlot(index: number, value: string) {
    setSlots(slots.map((item, position) => (position === index ? value.replace(/[^0-9]/g, '').slice(0, 7) : item)));
  }
  // «×» of the mockup: clears the cell; an extra cell beyond the first ten goes away.
  function clearSlot(index: number) {
    setSlots(slots.length > planned ? slots.filter((_, position) => position !== index) : slots.map((item, position) => (position === index ? '' : item)));
  }
  // «+ Carga rápida (10 sacos a 50 kg)»: fills the empty cells first.
  function quickFill() {
    let left = quickLoad;
    const next = slots.map((item) => (!validSackWeight(item) && left > 0 ? (left -= 1, quickWeight) : item));
    while (left > 0) { next.push(quickWeight); left -= 1; }
    setSlots(next);
  }
  function focusCell(index: number) {
    if (index >= slots.length) { Keyboard.dismiss(); return; }
    const cell = cellRefs.current.get(index);
    if (cell) { cell.focus(); return; }
    // A cell outside the drawn rows: scroll the grid there, then focus it.
    const row = Math.floor(index / sheetColumns);
    setFirstRow(row);
    gridRef.current?.scrollTo({ animated: false, y: row * sheetRowHeight });
    setTimeout(() => cellRefs.current.get(index)?.focus(), 50);
  }
  function selectLine(id: string) {
    props.onSelectLine(id);
  }

  return (
    <AppScreen contentContainerStyle={s.screen} scrollRef={screenRef} testID="sale-sheet">
      <AppHeader eyebrow="MÓDULO DE VENTA" subtitle="Despacho y pesaje en cancha" title="Venta" />
      {props.notice}
      {props.errorMessage ? <FeedbackState title="Revisa la operación" message={props.errorMessage} tone="error" /> : null}

      <View style={[s.card, p.details]} testID="sale-buyer">
        <View style={p.detailWide}>
          <FormField appearance="stitch" autoComplete="off" autoCorrect={false} importantForAutofill="no" editable={!busy} label="Nombre del cliente / comprador" onSubmitEditing={() => documentRef.current?.focus()} returnKeyType="next" submitBehavior="submit" leadingIcon="domain" maxLength={160} onChangeText={props.onBuyerNameChange} placeholder="Ingrese nombre o razón social…" value={props.buyerName} />
          {props.buyerSuggestions.length ? (
            <View accessibilityLabel="Compradores que coinciden" style={buyerStyles.suggestions}>
              {props.buyerSuggestions.map((item) => (
                <Pressable accessibilityHint="Completa el celular y el destino del comprador" accessibilityLabel={`Elegir ${item.label}`} accessibilityRole="button" key={item.id} onPress={() => props.onPickBuyer(item.id)} style={({ pressed }) => [buyerStyles.suggestion, pressed && s.dimmed]}>
                  <SymbolView fallback={null} name={{ android: 'domain', ios: 'building.2', web: 'domain' }} size={16} tintColor="#727974" />
                  <Text numberOfLines={1} style={buyerStyles.suggestionText}>{item.label}</Text>
                  {item.supportingText ? <Text numberOfLines={1} style={buyerStyles.suggestionHint}>{item.supportingText}</Text> : null}
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
        <View style={buyerStyles.document}><FormField appearance="stitch" autoComplete="off" autoCorrect={false} importantForAutofill="no" editable={!busy} keyboardType="number-pad" label="RUC / DNI" onSubmitEditing={() => (props.phoneEditable ? phoneRef.current?.focus() : focusCell(0))} ref={documentRef} returnKeyType="next" submitBehavior="submit" leadingIcon="badge" maxLength={11} onChangeText={(value) => props.onBuyerDocumentChange(value.replace(/[^0-9]/g, ''))} placeholder="20…" value={props.buyerDocument} /></View>
        <View style={p.detail}><FormField appearance="stitch" autoComplete="off" autoCorrect={false} importantForAutofill="no" editable={!busy && props.phoneEditable} keyboardType="phone-pad" label="N.° celular" onSubmitEditing={() => focusCell(0)} ref={phoneRef} returnKeyType="next" submitBehavior="submit" leadingIcon="call" maxLength={32} onChangeText={props.onBuyerPhoneChange} placeholder="999 000 000" value={props.buyerPhone} /></View>
        <View style={[buyerStyles.date, buyerStyles.dateField]}>
          <Text style={buyerStyles.dateLabel}>FECHA DESPACHO</Text>
          <Pressable accessibilityHint="Abre el calendario con Hoy y Mañana" accessibilityLabel={`Fecha despacho: ${props.dispatchDate}`} accessibilityRole="button" disabled={busy} onPress={() => { Keyboard.dismiss(); setDateOpen(true); }} style={({ pressed }) => [buyerStyles.dateControl, pressed && s.dimmed]} testID="sale-dispatch-date">
            <SymbolView fallback={null} name={{ android: 'calendar_today', ios: 'calendar', web: 'calendar_today' }} size={20} tintColor="#74777F" />
            <Text style={buyerStyles.dateValue}>{props.dispatchDate}</Text>
          </Pressable>
        </View>
        {props.buyerNotice ? <Text accessibilityLiveRegion="polite" style={buyerStyles.notice}>{props.buyerNotice}</Text> : null}
      </View>

      <View style={[s.card, s.tabsCard]}>
        <View accessibilityRole="tablist" style={s.tabs}>
          {props.lines.length ? props.lines.map((line, index) => {
            const selected = index === activeIndex;
            const count = line.weights?.length ?? 0;
            return (
              <Pressable accessibilityLabel={`Lote ${letter(index)}: ${props.lineName(line)}, ${count} ${sackWord(count)}`} accessibilityRole="tab" accessibilityState={{ selected }} key={line.id} onPress={() => selectLine(line.id)} style={[s.tab, selected && s.tabSelected]} testID={`lot-tab-${letter(index)}`}>
                <View style={[s.tabLetter, selected && s.tabLetterSelected]}><Text style={[s.tabLetterText, selected && s.onBrand]}>{letter(index)}</Text></View>
                <Text numberOfLines={1} style={[s.tabName, selected && s.onBrand]}>{props.lineName(line)}</Text>
                <View style={[s.tabCount, selected && s.tabCountSelected]}><Text style={[s.tabCountText, selected && s.onBrand]}>{count} {sackWord(count)}</Text></View>
              </Pressable>
            );
          }) : <Text style={s.help}>Añade el primer lote para empezar a pesar.</Text>}
        </View>
        <Pressable accessibilityLabel="Añadir lote o variedad" accessibilityRole="button" disabled={busy} onPress={props.onAddLot} style={({ pressed }) => [s.addLot, (pressed || busy) && s.dimmed]}>
          <SymbolView fallback={null} name={{ android: 'add_circle', ios: 'plus.circle', web: 'add_circle' }} size={20} tintColor={color.textOnBrand} />
          <Text style={s.addLotText}>+ Añadir lote / variedad</Text>
        </Pressable>
      </View>

      <View style={s.card} testID="sale-lot">
        {active ? (
          <View style={s.lotHeader}>
            <View style={s.lotChip}>
              <SymbolView fallback={null} name={{ android: 'inventory_2', ios: 'shippingbox', web: 'inventory_2' }} size={20} tintColor="#6EE7B7" />
              <Text numberOfLines={1} style={s.lotChipText}>{props.lineName(active)}</Text>
              {props.onEditLot || props.lotCharacteristics ? (
                <Pressable accessibilityLabel="Editar o cambiar variedad y calidad" accessibilityRole="button" disabled={busy} onPress={() => (props.onEditLot ? props.onEditLot() : setCharacteristicsOpen(true))} style={p.edit}>
                  <SymbolView fallback={null} name={{ android: 'edit', ios: 'pencil', web: 'edit' }} size={17} tintColor="#6EE7B7" />
                </Pressable>
              ) : null}
            </View>
            <View style={p.lotEnd}>
              <View style={s.lotBadge}><Text style={s.lotBadgeText}>Lote {letter(activeIndex)}</Text></View>
              {props.onRemoveLot ? (
                <Pressable accessibilityLabel={`Quitar lote ${letter(activeIndex)}`} accessibilityRole="button" disabled={busy} onPress={() => { if (weights.length) setRemoveAsked(true); else props.onRemoveLot?.(active.id); }} style={p.remove}>
                  <SymbolView fallback={null} name={{ android: 'delete_sweep', ios: 'trash', web: 'delete_sweep' }} size={16} tintColor={color.danger} />
                  <Text style={p.removeText}>Quitar lote</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={s.gridHeader}>
          <View style={p.gridTitle}>
            <Text accessibilityRole="header" style={s.overline}>PESAJE DE SACOS INDIVIDUALES (KG)</Text>
            <Text style={p.gridHint}>· Escribe el peso en cada casilla; toca × para limpiar un saco</Text>
          </View>
          <View style={s.countBadge}><Text style={s.countBadgeText}>{weights.length} de {slots.length} {sackWord(slots.length)} registrados</Text></View>
        </View>

        <View style={s.gridBox}>
          {rows.length ? null : <Text style={s.empty}>Elige el comprador y añade un lote o variedad para empezar a pesar.</Text>}
          <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled onScroll={(event) => { const row = Math.floor(event.nativeEvent.contentOffset.y / sheetRowHeight); if (row !== firstRow) setFirstRow(row); }} ref={gridRef} scrollEventThrottle={32} style={s.grid} testID="sale-grid">
            <View style={{ height: windowStart * sheetRowHeight }} />
            {rows.slice(windowStart, windowEnd).map((row) => (
              <View key={row[0]!.index} style={s.gridRow}>
                {row.map((cell) => {
                  const number = String(cell.index + 1).padStart(2, '0');
                  const filled = validSackWeight(cell.value);
                  const invalid = cell.value.trim().length > 0 && !filled;
                  return (
                    <View key={cell.index} style={[s.cell, slotStyles.cell, filled ? slotStyles.cellFilled : slotStyles.cellEmpty, invalid && slotStyles.cellInvalid]} testID={`sale-sack-${cell.index + 1}`}>
                      <View style={[slotStyles.number, filled && slotStyles.numberFilled]}><Text style={[slotStyles.numberText, filled && slotStyles.numberTextFilled]}>{number}</Text></View>
                      <View style={slotStyles.right}>
                        <SheetInput accessibilityHint={invalid ? 'Escribe kilos enteros mayores que cero' : undefined} accessibilityLabel={`Peso del saco ${cell.index + 1} (kg)`} editable={!busy} importantForAutofill="no" keyboardType="number-pad" autoComplete="off" autoCorrect={false} onChangeText={(value) => typeSlot(cell.index, value)} onSubmitEditing={() => focusCell(cell.index + 1)} placeholder="0.0" ref={(node) => { if (node) cellRefs.current.set(cell.index, node); else cellRefs.current.delete(cell.index); }} returnKeyType={cell.index + 1 < slots.length ? 'next' : 'done'} style={slotStyles.input} submitBehavior={cell.index + 1 < slots.length ? 'submit' : 'blurAndSubmit'} value={cell.value} />
                        <Text style={slotStyles.unit}>kg</Text>
                        <Pressable accessibilityLabel={`Limpiar saco ${cell.index + 1}`} accessibilityRole="button" disabled={busy} hitSlop={6} onPress={() => clearSlot(cell.index)} style={({ pressed }) => [slotStyles.clear, pressed && s.dimmed]}>
                          <SymbolView fallback={null} name={{ android: 'close', ios: 'xmark', web: 'close' }} size={14} tintColor="#727974" />
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
                {Array.from({ length: sheetColumns - row.length }, (_, index) => <View key={`gap-${index}`} style={[s.cell, s.cellGap]} />)}
              </View>
            ))}
            <View style={{ height: Math.max(0, rows.length - windowEnd) * sheetRowHeight }} />
          </ScrollView>
        </View>

        {active ? (
          <View style={p.addRow} testID="sale-capture">
            <Pressable accessibilityHint="Agrega una casilla vacía al lote" accessibilityLabel="Añadir 1 saco" accessibilityRole="button" disabled={busy} onPress={() => setSlots([...slots, ''])} style={({ pressed }) => [p.addSack, (pressed || busy) && s.dimmed]} testID="sale-add-cell">
              <SymbolView fallback={null} name={{ android: 'add_circle', ios: 'plus.circle', web: 'add_circle' }} size={18} tintColor={accent.emerald.ink} />
              <Text style={p.addSackText}>+ Añadir 1 saco</Text>
            </Pressable>
            <Pressable accessibilityHint="Llena con 50 kilos las casillas vacías y agrega las que falten hasta 10 sacos; luego puedes corregir cada peso" accessibilityLabel="Carga rápida de 10 sacos a 50 kilos" accessibilityRole="button" disabled={busy} onPress={quickFill} style={({ pressed }) => [p.tareBox, (pressed || busy) && s.dimmed]} testID="sale-quick-load">
              <SymbolView fallback={null} name={{ android: 'library_add', ios: 'plus.square.on.square', web: 'library_add' }} size={18} tintColor={accent.emerald.pillInk} />
              <Text style={p.tareLabel}>+ Carga rápida (10 sacos a 50 kg)</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={p.subtotal}>
          <View style={s.subtotalCopy}>
            <SymbolView fallback={null} name={{ android: 'scale', ios: 'scalemass', web: 'scale' }} size={22} tintColor={accent.emerald.ink} />
            <Text style={s.subtotalTitle}>SUBTOTAL LOTE {active ? letter(activeIndex) : ''}</Text>
            <Text style={s.help}>({weights.length} {sackWord(weights.length)} con peso)</Text>
          </View>
          <View style={s.subtotalWeight}>
            <Text style={s.help}>Peso total lote:</Text>
            <Text accessibilityLabel={`Peso total del lote: ${formatKilograms(gramsToKg(active ? saleLineGrams(active) : 0n))}`} style={s.subtotalValue}>{formatKilograms(gramsToKg(active ? saleLineGrams(active) : 0n)).replace(' kg', '')}</Text>
            <Text style={p.kgUnit}>kg</Text>
          </View>
        </View>
      </View>

      <Pressable accessibilityLabel="Ver cálculo consolidado y liquidación comercial" accessibilityRole="button" onPress={() => screenRef.current?.scrollTo({ animated: true, y: tableY.current })} style={({ pressed }) => [p.jump, pressed && s.dimmed]}>
        <Text style={p.jumpText}>VER CÁLCULO CONSOLIDADO Y LIQUIDACIÓN COMERCIAL</Text>
        <SymbolView fallback={null} name={{ android: 'arrow_downward', ios: 'arrow.down', web: 'arrow_downward' }} size={18} tintColor={accent.emerald.pillInk} />
      </Pressable>

      <View onLayout={(event) => { tableY.current = event.nativeEvent.layout.y; }} style={s.card} testID="sale-table">
        <View style={s.sectionHeader}>
          <View style={s.sectionTitleRow}>
            <View style={p.bullet} />
            <Text accessibilityRole="header" style={s.sectionTitle}>Resultado de venta por variedad / lote / despacho</Text>
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
        {props.lines.length ? props.lines.map((line, index) => {
          const count = line.weights?.length ?? 0;
          const amount = lineAmount(line);
          const current = index === activeIndex;
          return (
            <View key={line.id} style={[s.tableRow, current && p.rowActive]} testID={`sale-lot-${letter(index)}`}>
              <View style={s.colLot}><Pressable accessibilityLabel={`Ir al lote ${letter(index)}`} accessibilityRole="button" disabled={busy || current} onPress={() => selectLine(line.id)} style={[s.lotTag, !current && p.lotTagIdle]}><Text style={[s.lotTagText, !current && p.lotTagTextIdle]}>Lote {letter(index)}</Text></Pressable></View>
              <View style={s.colVariety}><View style={sheetLayout2.nameBox}><Text numberOfLines={1} style={sheetLayout2.nameText}>{props.lineName(line)}</Text></View></View>
              <View style={s.colSacks}><View style={s.sacksPill}><Text style={s.sacksPillText}>{count} {sackWord(count)}</Text></View></View>
              <View style={s.colWeight}><View style={s.weightPill}><Text style={s.weightPillText}>{formatKilograms(gramsToKg(saleLineGrams(line)))}</Text></View></View>
              <View style={[s.colPrice, s.priceCell]}>
                <SheetInput accessibilityLabel={`Precio ${line.priceBasis === 'kilogram' ? 'por kilogramo' : 'por saco'}, lote ${letter(index)} (S/)`} editable={!busy} keyboardType="decimal-pad" onChangeText={(value) => props.onChangeLine(line.id, 'unitPrice', value)} placeholder="0.00" style={[s.tableInput, s.priceInput]} value={line.unitPrice} />
              </View>
              <Text accessibilityLabel={`Importe del lote ${letter(index)}: ${amount === null ? (count ? 'Pendiente' : 'S/ 0.00') : formatMoney(amount.toString())}`} style={[s.amount, s.colAmount]}>{amount === null ? (count ? 'Pendiente' : 'S/ 0.00') : formatMoney(amount.toString())}</Text>
            </View>
          );
        }) : <Text style={s.empty}>Los lotes de la venta aparecen aquí.</Text>}
        <View style={p.totals}>
          <BigTotal label="TOTAL SACOS DESPACHADOS:" unit="uds" value={`${totalSacks}`} />
          <BigTotal label="TOTAL KILAJE GENERAL:" unit="kg" value={formatKilograms(gramsToKg(totalGrams)).replace(' kg', '')} />
          <BigTotal accessibilityLabel={`Total venta: ${money('grossCents')}`} label="TOTAL VENTA (S/):" strong value={money('grossCents')} />
        </View>
      </View>

      <View style={s.card} testID="sale-freight">
        <View style={s.sectionHeader}>
          <View style={s.sectionTitleRow}>
            <SymbolView fallback={null} name={{ android: 'local_shipping', ios: 'truck.box', web: 'local_shipping' }} size={22} tintColor={color.brand} />
            <Text accessibilityRole="header" style={s.sectionTitle}>Flete / estiba de carga (despacho)</Text>
          </View>
          <View accessibilityRole="radiogroup" style={p.segment}>
            {([['sack', 'Por sacos'], ['kilogram', 'Por kilaje']] as const).map(([value, label]) => (
              <Pressable accessibilityLabel={`Flete: ${label.toLowerCase()}`} accessibilityRole="radio" accessibilityState={{ checked: props.freightBasis === value }} disabled={busy} key={value} onPress={() => props.onChange('freightBasis', value)} style={[p.segmentOption, props.freightBasis === value && p.segmentSelected]}>
                <Text style={[p.segmentText, props.freightBasis === value && s.onBrand]}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        {(
          <View style={s.freightRow}>
            <View style={s.freightChip}>
              <Text style={s.freightQuantity}>{props.freightBasis === 'sack' ? `${totalSacks}` : formatKilograms(gramsToKg(totalGrams)).replace(' kg', '')}</Text>
              <Text style={p.freightUnit}>{props.freightBasis === 'sack' ? sackWord(totalSacks) : 'kg'}</Text>
              <Text style={s.freightTimes}>× S/</Text>
              <SheetInput accessibilityLabel="Tarifa de flete (S/)" editable={!busy} keyboardType="decimal-pad" onChangeText={(value) => props.onChange('freightRate', value)} placeholder="0.00" style={s.freightInput} value={props.freightRate} />
            </View>
            <Text style={[s.help, s.grow]}>{props.freightRate.trim() && Number(props.freightRate.replace(',', '.')) > 0 ? 'Tarifa por unidad seleccionada' : 'Tarifa 0: la venta va sin flete'}</Text>
            <Text style={p.freightLabel}>SUBTOTAL FLETE:</Text>
            <Text accessibilityLabel={`Subtotal de flete: ${money('freightCents')}`} style={s.freightAmount}>{money('freightCents')}</Text>
          </View>
        )}
        <View style={p.freightMore}>
          <View style={p.vehicle}><SelectionField appearance="stitch" disabled={busy} label="Vehículo (opcional)" leadingIcon="local_shipping" onPress={props.onSelectVehicle} placeholder="Seleccionar placa" value={props.vehiclePlate} /></View>
          <View style={p.vehicle}><FormField appearance="stitch" editable={!busy} label="Conductor" leadingIcon="badge" onChangeText={props.onDriverChange} placeholder="Nombre del conductor" value={props.driver} /></View>
          <View style={p.vehicle}><FormField appearance="stitch" editable={!busy} label="Destino" leadingIcon="place" onChangeText={props.onDestinationChange} placeholder="Departamento" value={props.destination} /></View>
          {(
            <View style={p.payer}>
              <Text style={p.payerLabel}>¿CÓMO SE COBRA EL FLETE?</Text>
              <View accessibilityRole="radiogroup" style={p.segment}>
                {([[false, 'Flete separado'], [true, 'Incluir en total']] as const).map(([value, label]) => (
                  <Pressable accessibilityLabel={label} accessibilityRole="radio" accessibilityState={{ checked: props.freightIncluded === value }} disabled={busy} key={label} onPress={() => props.onChange('freightIncluded', String(value))} style={[p.segmentOption, props.freightIncluded === value && p.segmentSelected]}>
                    <Text style={[p.segmentText, props.freightIncluded === value && s.onBrand]}>{label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>

      <View style={s.card} testID="sale-summary">
        <View style={[s.sectionHeader, p.summaryHead]}>
          <View style={s.sectionTitleRow}>
            <SymbolView fallback={null} name={{ android: 'account_balance_wallet', ios: 'wallet.pass', web: 'account_balance_wallet' }} size={22} tintColor={color.brand} />
            <Text accessibilityRole="header" style={s.sectionTitle}>Resumen de liquidación</Text>
          </View>
          <Text style={s.balance}>BALANCE COMERCIAL</Text>
        </View>
        <View style={p.summary}>
          <View style={p.summaryLeft}>
            <Line label="Total cobro (producto):" value={money('grossCents')} />
            <Line label={props.freightIncluded ? 'Flete / estiba (cobro):' : 'Flete / estiba (separado, no suma):'} value={props.freightBasis === 'none' ? 'S/ 0.00' : money('freightCents')} />
            <View style={p.line}>
              <Text style={p.lineLabel}>Otros cargos / ajustes:</Text>
              <Text style={p.currency}>S/</Text>
              <SheetInput accessibilityLabel="Descuentos (S/)" editable={!busy} keyboardType="decimal-pad" onChangeText={(value) => props.onChange('discounts', value)} placeholder="0.00" style={p.lineInput} value={props.discounts} />
            </View>
          </View>
          <View style={p.summaryRight}>
            <View style={p.net}>
              <View>
                <Text style={p.netTitle}>TOTAL NETO A COBRAR</Text>
                <Text style={p.netHelp}>{props.paymentMode === 'cash' ? 'Saldo a cobrar al despacho' : 'Saldo a crédito, en cuotas'}</Text>
              </View>
              <Text accessibilityLabel={`Total neto a cobrar: ${money('totalCents')}`} style={p.netValue}>{money('totalCents')}</Text>
            </View>
            <View style={p.payment}>
              <Text style={p.payerLabel}>FORMA DE PAGO</Text>
              <View accessibilityRole="radiogroup" style={p.segment}>
                {([['cash', 'Contado'], ['credit', 'Crédito']] as const).map(([value, label]) => (
                  <Pressable accessibilityLabel={label} accessibilityRole="radio" accessibilityState={{ checked: props.paymentMode === value }} disabled={busy} key={value} onPress={() => props.onChange('paymentMode', value)} style={[p.segmentOption, props.paymentMode === value && p.segmentSelected]}>
                    <Text style={[p.segmentText, props.paymentMode === value && s.onBrand]}>{label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </View>
        {props.paymentMode === 'credit' ? (
          <InstallmentRows busy={busy} installments={props.installments} onAdd={props.onAddInstallment} onChange={props.onChangeInstallment} onRemove={props.onRemoveInstallment} />
        ) : null}
        {preview.kind !== 'ready' && totalSacks ? <FeedbackState title="Importes pendientes" message={preview.message} /> : null}
        <Text style={s.help}>Importes provisionales: el servidor los verifica al guardar y registra la venta y su efecto en caja o en la cuenta del comprador.</Text>
      </View>

      <View style={s.actions}>
        <Pressable accessibilityLabel="Limpiar registro" accessibilityRole="button" disabled={busy} onPress={props.onClear} style={({ pressed }) => [s.clear, (pressed || busy) && s.dimmed]}>
          <SymbolView fallback={null} name={{ android: 'restart_alt', ios: 'arrow.counterclockwise', web: 'restart_alt' }} size={22} tintColor={color.brand} />
          <Text style={s.clearText}>Limpiar registro</Text>
        </Pressable>
        <Pressable accessibilityLabel="Guardar venta" accessibilityRole="button" disabled={!canSave} onPress={props.onSave} style={({ pressed }) => [s.save, (pressed || !canSave) && s.dimmed]} testID="save-sale">
          <SymbolView fallback={null} name={{ android: 'point_of_sale', ios: 'cart', web: 'point_of_sale' }} size={22} tintColor="#6EE7B7" />
          <Text style={s.saveText}>{busy ? 'Guardando…' : 'Guardar venta'}</Text>
        </Pressable>
      </View>

      <ConfirmationDialog confirmLabel="Quitar lote" message={active ? `Se quitará el lote ${letter(activeIndex)} (${props.lineName(active)}) con sus ${weights.length} ${sackWord(weights.length)} pesados. La venta todavía no se ha guardado.` : ''} onCancel={() => setRemoveAsked(false)} onConfirm={() => { setRemoveAsked(false); if (active) props.onRemoveLot?.(active.id); }} title="¿Quitar el lote?" visible={removeAsked} />
      {dateOpen ? <DateDialog onCancel={() => setDateOpen(false)} onPick={(value) => { setDateOpen(false); props.onDispatchDateChange(value); }} title="Fecha de despacho" value={props.dispatchDate} visible /> : null}
      <Modal animationType="fade" onRequestClose={() => setCharacteristicsOpen(false)} transparent visible={characteristicsOpen}>
        <View style={p.modalBackdrop}>
          <View style={p.modal}>
            <Text accessibilityRole="header" style={s.sectionTitle}>Calidad y procedencia del lote</Text>
            {props.lotCharacteristics}
            <Pressable accessibilityLabel="Listo" accessibilityRole="button" onPress={() => setCharacteristicsOpen(false)} style={[s.save, p.modalDone]}><Text style={s.saveText}>Listo</Text></Pressable>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

// Cells of the mockup: number on the left, the weight, «kg» and «×»; empty
// cells are dashed with a light number, weighed ones solid with a dark one.
const slotStyles = StyleSheet.create({
  cell: { justifyContent: 'space-between', paddingHorizontal: 8 },
  cellFilled: { backgroundColor: '#EFF4FF', borderColor: '#D3E4FE', borderStyle: 'solid', borderWidth: 1 },
  cellEmpty: { backgroundColor: '#F8F9FF', borderColor: '#C2C8C3', borderStyle: 'dashed', borderWidth: 1 },
  cellInvalid: { borderColor: '#BA1A1A', borderStyle: 'solid' },
  number: { alignItems: 'center', backgroundColor: '#E5EEFF', borderRadius: 6, height: 26, justifyContent: 'center', width: 28 },
  numberFilled: { backgroundColor: '#08241A' },
  numberText: { color: '#727974', fontFamily: 'monospace', fontSize: 11, fontWeight: '700' },
  numberTextFilled: { color: '#FFFFFF' },
  right: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  input: { backgroundColor: '#FFFFFF', borderColor: '#C2C8C3', borderRadius: 6, borderWidth: 1, fontSize: 14, fontWeight: '800', minHeight: 34, paddingHorizontal: 6, paddingVertical: 2, textAlign: 'right', width: 72 },
  unit: { color: '#727974', fontSize: 11, fontWeight: '500' },
  clear: { alignItems: 'center', borderRadius: 6, height: 32, justifyContent: 'center', width: 28 },
});

const buyerStyles = StyleSheet.create({
  document: { flexBasis: 150, flexGrow: 0.8, minWidth: 0 },
  date: { flexBasis: 150, flexGrow: 0.8, minWidth: 0 },
  suggestions: { backgroundColor: '#FFFFFF', borderColor: '#D3E4FE', borderRadius: 10, borderWidth: 1, marginTop: 6, overflow: 'hidden' },
  suggestion: { alignItems: 'center', borderBottomColor: '#EFF4FF', borderBottomWidth: 1, flexDirection: 'row', gap: 8, minHeight: 44, paddingHorizontal: 12 },
  suggestionText: { color: '#0B1C30', flexShrink: 1, fontSize: 14, fontWeight: '600' },
  suggestionHint: { color: '#727974', fontSize: 12, marginLeft: 'auto' },
  notice: { color: '#424844', flexBasis: '100%', fontSize: 12 },
  dateField: { gap: 6 },
  dateLabel: { color: '#64748B', fontSize: 12, fontWeight: '600', letterSpacing: 0.8, lineHeight: 16 },
  dateControl: { alignItems: 'center', backgroundColor: '#EFF4FF', borderRadius: 12, flexDirection: 'row', gap: 10, minHeight: 44, paddingHorizontal: 13 },
  dateValue: { color: '#0B1C30', fontSize: 14, fontWeight: '500' },
});

const sheetLayout2 = StyleSheet.create({
  nameBox: { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: 8, borderWidth: 1, justifyContent: 'center', minHeight: 40, paddingHorizontal: 12 },
  nameText: { color: '#0F172A', fontSize: 15, fontWeight: '600' as const },
});

// Provisional amount of one lot, the same rounding as calculateSalePreview.
function lineAmount(line: SaleLineDraft): bigint | null {
  const normalized = line.unitPrice.trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ''] = normalized.split('.');
  const rate = BigInt(whole!) * 100n + BigInt(fraction.padEnd(2, '0'));
  const count = BigInt(line.weights?.length ?? 0);
  if (rate <= 0n || count === 0n) return null;
  return line.priceBasis === 'sack' ? count * rate : (saleLineGrams(line) * rate + 500n) / 1000n;
}
