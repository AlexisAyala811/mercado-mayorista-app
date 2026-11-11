import { SymbolView } from '@/ui/components/symbol';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { formatMoney } from '@/domain/reception/reception';
import type { SalePreview } from '@/domain/sales/sale-preview';
import { saleLineGrams, type SaleLineDraft } from '@/domain/sales/sale';
import { BigTotal, gramsToKg, Line, sheetColumns, sheetLayout as p, sheetRowHeight, SheetInput, sheetStyles as s } from '@/features/reception/screens/purchase-sheet';
import type { InstallmentDraft } from '@/features/reception/screens/settlement-screen';
import { AppButton, AppScreen, FeedbackState, FormField, SelectionField } from '@/ui/components';
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
  buyerName?: string;
  buyerPhone?: string | null;
  dispatchDate: string;
  destination: string;
  onDestinationChange: (value: string) => void;
  vehiclePlate?: string;
  driver: string;
  onDriverChange: (value: string) => void;
  onSelectBuyer: () => void;
  onSelectVehicle: () => void;
  referenceActions?: ReactNode;
  // Quality and origin of the active lot.
  lotCharacteristics?: ReactNode;
  // Lots: one per variety, quality and origin.
  lines: SaleLineDraft[];
  lineName: (line: SaleLineDraft) => string;
  activeLineId: string | null;
  onSelectLine: (id: string) => void;
  onAddLot: () => void;
  onRemoveLot?: (id: string) => void;
  onAddSack: (weight: string) => void;
  onCorrectSack: (index: number, weight: string) => void;
  // Number of cells of the lot (CL-ST22): only how many boxes are drawn.
  onPlanSacks: (id: string, count: number) => void;
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

type Cell = { kind: 'sack'; index: number; value: string } | { kind: 'draft'; index: number } | { kind: 'empty'; index: number };

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
  const draftRef = useRef<TextInput>(null);
  const [firstRow, setFirstRow] = useState(0);
  const [weight, setWeight] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const [characteristicsOpen, setCharacteristicsOpen] = useState(false);
  const busy = Boolean(props.busy);
  const activeIndex = Math.max(0, props.lines.findIndex((line) => line.id === props.activeLineId));
  const active = props.lines[activeIndex];
  const weights = useMemo(() => active?.weights ?? [], [active]);
  // The lot shows its planned cells; there is always one free cell to type in.
  const capacity = active ? Math.max(weights.length + 1, active.plannedSacks ?? 0) : 0;
  const cells = useMemo<Cell[]>(() => Array.from({ length: capacity }, (_, index) => (
    index < weights.length ? { kind: 'sack' as const, index, value: weights[index]! } : index === weights.length && editing === null ? { kind: 'draft' as const, index } : { kind: 'empty' as const, index }
  )), [capacity, editing, weights]);
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
  const canAdd = Boolean(active) && !busy && /^\d{1,7}$/.test(weight.trim()) && Number(weight) > 0;
  const canSave = !busy && totalSacks > 0 && preview.kind === 'ready';

  useBottomNav({
    back: { label: 'Atrás', disabled: busy, onPress: props.onBack },
    home: { label: 'Menú principal', disabled: busy, onPress: props.onGoHome },
    next: { label: busy ? 'Guardando…' : 'Guardar venta', disabled: !canSave, onPress: props.onSave },
  });

  function saveSack() {
    if (!canAdd) return;
    if (editing !== null) props.onCorrectSack(editing, weight.trim());
    else props.onAddSack(weight.trim());
    setWeight('');
    setEditing(null);
  }
  function selectLine(id: string) {
    props.onSelectLine(id);
    setEditing(null);
    setWeight('');
  }

  return (
    <AppScreen contentContainerStyle={s.screen} scrollRef={screenRef} testID="sale-sheet">
      <AppHeader eyebrow="MÓDULO DE VENTA" subtitle="Despacho y pesaje en cancha" title="Venta" />
      {props.notice}
      {props.errorMessage ? <FeedbackState title="Revisa la operación" message={props.errorMessage} tone="error" /> : null}

      <View style={[s.card, p.details]} testID="sale-buyer">
        <View style={p.detailWide}><SelectionField appearance="stitch" disabled={busy} label="Nombre del cliente / comprador" leadingIcon="domain" onPress={props.onSelectBuyer} placeholder="Selecciona un comprador" value={props.buyerName} /></View>
        <View style={p.detail}><FormField appearance="stitch" editable={!busy} label="Destino" leadingIcon="place" onChangeText={props.onDestinationChange} placeholder="Departamento" value={props.destination} /></View>
        <View style={p.detail}><FormField appearance="stitch" editable={false} label="N.° celular" leadingIcon="call" value={props.buyerPhone ?? '—'} /></View>
        <View style={p.detail}><FormField appearance="stitch" editable={false} label="Fecha despacho" leadingIcon="calendar_today" value={props.dispatchDate} /></View>
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
        <View style={p.tabsLinks}>{props.referenceActions}</View>
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
              {props.lotCharacteristics ? (
                <Pressable accessibilityLabel="Cambiar calidad y procedencia del lote" accessibilityRole="button" disabled={busy} onPress={() => setCharacteristicsOpen(true)} style={p.edit}>
                  <SymbolView fallback={null} name={{ android: 'edit', ios: 'pencil', web: 'edit' }} size={17} tintColor="#6EE7B7" />
                </Pressable>
              ) : null}
            </View>
            <View style={p.lotEnd}>
              <View style={s.lotBadge}><Text style={s.lotBadgeText}>Lote {letter(activeIndex)}</Text></View>
              {props.onRemoveLot && !weights.length ? (
                <Pressable accessibilityLabel={`Quitar lote ${letter(activeIndex)}`} accessibilityRole="button" disabled={busy} onPress={() => props.onRemoveLot?.(active.id)} style={p.remove}>
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
            <Text style={p.gridHint}>· Escribe el peso en la casilla; toca un saco para corregirlo</Text>
          </View>
          <View style={s.countBadge}><Text style={s.countBadgeText}>{weights.length} de {Math.max(capacity, weights.length)} {sackWord(capacity)} registrados</Text></View>
        </View>

        <View style={s.gridBox}>
          {rows.length ? null : <Text style={s.empty}>Elige el comprador y añade un lote o variedad para empezar a pesar.</Text>}
          <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled onScroll={(event) => { const row = Math.floor(event.nativeEvent.contentOffset.y / sheetRowHeight); if (row !== firstRow) setFirstRow(row); }} ref={gridRef} scrollEventThrottle={32} style={s.grid} testID="sale-grid">
            <View style={{ height: windowStart * sheetRowHeight }} />
            {rows.slice(windowStart, windowEnd).map((row) => (
              <View key={row[0]!.index} style={s.gridRow}>
                {row.map((cell) => {
                  const number = String(cell.index + 1).padStart(2, '0');
                  if (cell.kind === 'draft' || (cell.kind === 'sack' && editing === cell.index)) {
                    return (
                      <View key={cell.index} style={[s.cell, cell.kind === 'sack' ? s.cellHighlighted : sheetLayout2.cellFocus]} testID={cell.kind === 'draft' ? 'sale-sack-draft' : `sale-sack-${cell.index + 1}`}>
                        <View style={[s.cellNumber, cell.kind === 'draft' && sheetLayout2.cellNumberEmpty]}><Text style={[s.cellNumberText, cell.kind === 'draft' && sheetLayout2.cellNumberEmptyText]}>{number}</Text></View>
                        <SheetInput accessibilityLabel={cell.kind === 'draft' ? `Peso del saco ${cell.index + 1} (kg)` : `Corregir peso del saco ${cell.index + 1} (kg)`} autoFocus={cell.kind === 'sack'} editable={!busy} keyboardType="number-pad" onChangeText={setWeight} onSubmitEditing={saveSack} placeholder="0.0" ref={cell.kind === 'draft' ? draftRef : undefined} returnKeyType="done" style={p.cellInput} submitBehavior="submit" value={weight} />
                        <Text style={s.cellUnit}>kg</Text>
                      </View>
                    );
                  }
                  if (cell.kind === 'empty') {
                    return (
                      <Pressable accessibilityHint="Escribe el peso en la siguiente casilla libre" accessibilityLabel={`Saco ${cell.index + 1}: sin peso`} accessibilityRole="button" disabled={busy} key={cell.index} onPress={() => draftRef.current?.focus()} style={[s.cell, sheetLayout2.cellEmpty]} testID={`sale-sack-empty-${cell.index + 1}`}>
                        <View style={[s.cellNumber, sheetLayout2.cellNumberEmpty]}><Text style={[s.cellNumberText, sheetLayout2.cellNumberEmptyText]}>{number}</Text></View>
                        <View style={[s.cellValue, sheetLayout2.cellValueEmpty]}><Text style={sheetLayout2.cellValueEmptyText}>0.0</Text></View>
                        <Text style={s.cellUnit}>kg</Text>
                      </Pressable>
                    );
                  }
                  return (
                    <Pressable accessibilityHint="Corrige el peso" accessibilityLabel={`Saco ${cell.index + 1}: ${cell.value} kilos`} accessibilityRole="button" disabled={busy} key={cell.index} onPress={() => { setEditing(cell.index); setWeight(cell.value); }} style={({ pressed }) => [s.cell, pressed && s.dimmed]} testID={`sale-sack-${cell.index + 1}`}>
                      <View style={s.cellNumber}><Text style={s.cellNumberText}>{number}</Text></View>
                      <View style={s.cellValue}><Text style={s.cellValueText}>{cell.value}</Text></View>
                      <Text style={s.cellUnit}>kg</Text>
                    </Pressable>
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
            <Pressable accessibilityLabel="Añadir 1 saco" accessibilityHint="Agrega una casilla vacía al lote" accessibilityRole="button" disabled={busy} onPress={() => props.onPlanSacks(active.id, capacity + 1)} style={({ pressed }) => [p.addSack, (pressed || busy) && s.dimmed]} testID="sale-add-cell">
              <SymbolView fallback={null} name={{ android: 'add_circle', ios: 'plus.circle', web: 'add_circle' }} size={18} tintColor={accent.emerald.ink} />
              <Text style={p.addSackText}>+ Añadir 1 saco</Text>
            </Pressable>
            <Pressable accessibilityLabel={editing !== null ? 'Guardar corrección' : 'Registrar peso'} accessibilityRole="button" disabled={!canAdd} onPress={saveSack} style={({ pressed }) => [p.tareBox, (pressed || !canAdd) && s.dimmed]} testID="sale-add-sack">
              <SymbolView fallback={null} name={{ android: 'library_add', ios: 'plus.square.on.square', web: 'library_add' }} size={18} tintColor={accent.emerald.pillInk} />
              <Text style={p.tareLabel}>{editing !== null ? `Guardar corrección del saco ${editing + 1}` : `+ Registrar peso del saco ${weights.length + 1}`}</Text>
            </Pressable>
            {editing !== null ? <Pressable accessibilityLabel="Cancelar corrección" accessibilityRole="button" onPress={() => { setEditing(null); setWeight(''); }} style={p.cancel}><Text style={p.cancelText}>Cancelar</Text></Pressable> : null}
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
              <View style={s.colLot}><View style={[s.lotTag, !current && p.lotTagIdle]}><Text style={[s.lotTagText, !current && p.lotTagTextIdle]}>Lote {letter(index)}</Text></View></View>
              <View style={s.colVariety}><View style={sheetLayout2.nameBox}><Text numberOfLines={1} style={sheetLayout2.nameText}>{props.lineName(line)}</Text></View></View>
              <View style={s.colSacks}><View style={s.sacksPill}><Text style={s.sacksPillText}>{count} {sackWord(count)}</Text></View></View>
              <View style={s.colWeight}><View style={s.weightPill}><Text style={s.weightPillText}>{formatKilograms(gramsToKg(saleLineGrams(line)))}</Text></View></View>
              <View style={[s.colPrice, s.priceCell]}>
                <SheetInput accessibilityLabel={`Precio ${line.priceBasis === 'kilogram' ? 'por kilogramo' : 'por saco'}, lote ${letter(index)} (S/)`} editable={!busy} keyboardType="decimal-pad" onChangeText={(value) => props.onChangeLine(line.id, 'unitPrice', value)} placeholder="0.00" style={[s.tableInput, s.priceInput]} value={line.unitPrice} />
                <View accessibilityRole="radiogroup" style={p.basis}>
                  {([['kilogram', 'kg', 'por kilogramo'], ['sack', 'saco', 'por saco']] as const).map(([value, short, long]) => (
                    <Pressable accessibilityLabel={`Lote ${letter(index)}: ${long}`} accessibilityRole="radio" accessibilityState={{ checked: line.priceBasis === value }} disabled={busy} key={value} onPress={() => props.onChangeLine(line.id, 'priceBasis', value)} style={[p.basisOption, line.priceBasis === value && s.basisSelected]}>
                      <Text style={[p.basisText, line.priceBasis === value && s.onBrand]}>{short}</Text>
                    </Pressable>
                  ))}
                </View>
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
            {([['none', 'Sin flete'], ['sack', 'Por sacos'], ['kilogram', 'Por kilaje']] as const).map(([value, label]) => (
              <Pressable accessibilityLabel={`Flete: ${label.toLowerCase()}`} accessibilityRole="radio" accessibilityState={{ checked: props.freightBasis === value }} disabled={busy} key={value} onPress={() => props.onChange('freightBasis', value)} style={[p.segmentOption, props.freightBasis === value && p.segmentSelected]}>
                <Text style={[p.segmentText, props.freightBasis === value && s.onBrand]}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        {props.freightBasis === 'none' ? <Text style={s.help}>Esta venta no lleva flete.</Text> : (
          <View style={s.freightRow}>
            <View style={s.freightChip}>
              <Text style={s.freightQuantity}>{props.freightBasis === 'sack' ? `${totalSacks}` : formatKilograms(gramsToKg(totalGrams)).replace(' kg', '')}</Text>
              <Text style={p.freightUnit}>{props.freightBasis === 'sack' ? sackWord(totalSacks) : 'kg'}</Text>
              <Text style={s.freightTimes}>× S/</Text>
              <SheetInput accessibilityLabel="Tarifa de flete (S/)" editable={!busy} keyboardType="decimal-pad" onChangeText={(value) => props.onChange('freightRate', value)} placeholder="0.00" style={s.freightInput} value={props.freightRate} />
            </View>
            <Text style={[s.help, s.grow]}>Tarifa por unidad seleccionada</Text>
            <Text style={p.freightLabel}>SUBTOTAL FLETE:</Text>
            <Text accessibilityLabel={`Subtotal de flete: ${money('freightCents')}`} style={s.freightAmount}>{money('freightCents')}</Text>
          </View>
        )}
        <View style={p.freightMore}>
          <View style={p.vehicle}><SelectionField appearance="stitch" disabled={busy} label="Vehículo (opcional)" leadingIcon="local_shipping" onPress={props.onSelectVehicle} placeholder="Seleccionar placa" value={props.vehiclePlate} /></View>
          <View style={p.vehicle}><FormField appearance="stitch" editable={!busy} label="Conductor" leadingIcon="badge" onChangeText={props.onDriverChange} placeholder="Nombre del conductor" value={props.driver} /></View>
          {props.freightBasis !== 'none' ? (
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
          ) : null}
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
          <View style={{ gap: 12 }}>
            {props.installments.map((item, index) => (
              <View key={item.id} style={s.fields}>
                <View style={s.field}><FormField appearance="stitch" editable={!busy} label={`Vencimiento cuota ${index + 1}`} onChangeText={(value) => props.onChangeInstallment(item.id, 'dueOn', value)} placeholder="aaaa-mm-dd" value={item.dueOn} /></View>
                <View style={s.field}><FormField appearance="stitch" accessibilityLabel={`Importe cuota ${index + 1} (S/)`} editable={!busy} keyboardType="decimal-pad" label="Importe (S/)" onChangeText={(value) => props.onChangeInstallment(item.id, 'amount', value)} value={item.amount} /></View>
                <AppButton accessibilityLabel={`Quitar cuota ${index + 1}`} disabled={busy} label="Quitar" onPress={() => props.onRemoveInstallment(item.id)} tone="secondary" />
              </View>
            ))}
            <AppButton disabled={busy} label="Agregar cuota" onPress={props.onAddInstallment} tone="secondary" />
          </View>
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

// Empty cells of the mockup: light number and «0.0»; the free one is outlined.
const sheetLayout2 = StyleSheet.create({
  cellEmpty: { backgroundColor: '#F8FAFC' },
  cellFocus: { borderColor: '#10B981', borderStyle: 'dashed' as const, borderWidth: 1.5 },
  cellNumberEmpty: { backgroundColor: '#E2E8F0' },
  cellNumberEmptyText: { color: '#64748B' },
  cellValueEmpty: { backgroundColor: '#FFFFFF' },
  cellValueEmptyText: { color: '#94A3B8', fontSize: 15, fontWeight: '700' as const, textAlign: 'right' as const },
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
