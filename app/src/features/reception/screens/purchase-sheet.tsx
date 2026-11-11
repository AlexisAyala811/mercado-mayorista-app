import { SymbolView } from '@/ui/components/symbol';
import { useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { emptyLotDraft, formatPreviewMoney, previewLotAmount, type PurchaseLot, type PurchasePreview } from '@/domain/reception/purchase-preview';
import { formatKilograms } from '@/domain/reception/whole-kilograms';
import { PaymentTermsFields } from '@/features/reception/components/payment-terms-fields';
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

export type PurchaseSheetProps = {
  notice?: string;
  errorMessage?: string;
  busy?: boolean;
  blocked?: boolean;
  // Header: editable until the reception exists.
  details: ReceptionDetails;
  detailsLocked: boolean;
  onChangeDetail: (field: keyof ReceptionDetails, value: string) => void;
  onSelectProvider: () => void;
  onSelectVehicle: () => void;
  referenceActions?: ReactNode;
  // Lots: one tab per variety of the purchase.
  varieties: SheetVariety[];
  activeVarietyId: string;
  onSelectVariety: (id: string) => void;
  onAddVariety?: () => void;
  // Removes a variety without sacks before the reception exists.
  onRemoveVariety?: (id: string) => void;
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
  const locked = Boolean(props.busy || props.blocked);

  const active = props.varieties.find((variety) => variety.id === props.activeVarietyId) ?? props.varieties[0];
  const activeIndex = active ? props.varieties.indexOf(active) : -1;
  const activeSacks = useMemo(() => props.sacks.filter((sack) => sack.varietyId === active?.id), [active?.id, props.sacks]);
  const nextSequence = props.sacks.reduce((max, sack) => Math.max(max, sack.sequence), 0) + 1;
  const editing = props.editingSequence !== null;
  // The trailing cell is where the next sack is typed.
  const draft = !props.weighingLocked && Boolean(active) && !editing;
  const cells = useMemo(() => [...activeSacks.map((sack) => ({ kind: 'sack' as const, sack })), ...(draft ? [{ kind: 'draft' as const }] : [])], [activeSacks, draft]);
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
  const wholesalerFreight = values.freightBasis !== 'none' && values.freightChargedTo === 'wholesaler';

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
      {props.notice ? <FeedbackState title="Pendiente de confirmación central" message={props.notice} /> : null}
      {props.errorMessage ? <FeedbackState title="No se pudo completar la operación" message={props.errorMessage} tone="error" /> : null}

      <View style={[s.card, p.details]} testID="sheet-details">
        <View style={p.detailWide}><SelectionField appearance="stitch" disabled={props.detailsLocked || locked} label="Nombre del proveedor / productor" leadingIcon="person" onPress={props.onSelectProvider} placeholder="Nombre del productor o comunidad…" value={props.details.providerName} /></View>
        <View style={p.detail}><FormField appearance="stitch" editable={!props.detailsLocked && !locked} keyboardType="phone-pad" label="N.° celular" leadingIcon="call" onChangeText={(value) => props.onChangeDetail('providerPhone', value)} placeholder="999 000 000" value={props.details.providerPhone} /></View>
        <View style={p.detail}><FormField appearance="stitch" editable={!props.detailsLocked && !locked} label="Conductor" leadingIcon="badge" onChangeText={(value) => props.onChangeDetail('driverName', value)} placeholder="Nombre del conductor" value={props.details.driverName} /></View>
        <View style={p.detail}><FormField appearance="stitch" editable={!props.detailsLocked && !locked} label="Fecha de acopio" leadingIcon="calendar_today" onChangeText={(value) => props.onChangeDetail('date', value)} placeholder="aaaa-mm-dd" value={props.details.date} /></View>
        {props.detailsLocked ? null : <View style={p.detailLinks}>{props.referenceActions}</View>}
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
        {props.onAddVariety ? (
          <Pressable accessibilityLabel="Añadir lote o variedad" accessibilityRole="button" disabled={locked} onPress={props.onAddVariety} style={({ pressed }) => [s.addLot, (pressed || locked) && s.dimmed]}>
            <SymbolView fallback={null} name={{ android: 'add_circle', ios: 'plus.circle', web: 'add_circle' }} size={20} tintColor={color.textOnBrand} />
            <Text style={s.addLotText}>+ Añadir lote / variedad</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={s.card} testID="sheet-lot">
        <View style={s.lotHeader}>
          <View style={s.lotChip}>
            <SymbolView fallback={null} name={{ android: 'inventory_2', ios: 'shippingbox', web: 'inventory_2' }} size={20} tintColor="#6EE7B7" />
            <Text numberOfLines={1} style={s.lotChipText}>{active?.name ?? 'Sin variedad'}</Text>
            {props.qualityName ? <View style={p.quality}><Text style={p.qualityText}>{props.qualityName}</Text></View> : null}
            {props.characteristics && !props.weighingLocked ? (
              <Pressable accessibilityLabel="Cambiar calidad y procedencia de los próximos sacos" accessibilityRole="button" disabled={locked} onPress={() => setCharacteristicsOpen(true)} style={p.edit}>
                <SymbolView fallback={null} name={{ android: 'edit', ios: 'pencil', web: 'edit' }} size={17} tintColor="#6EE7B7" />
              </Pressable>
            ) : null}
          </View>
          <View style={p.lotEnd}>
            {active ? <View style={s.lotBadge}><Text style={s.lotBadgeText}>Lote {letter(activeIndex)}</Text></View> : null}
            {props.onRemoveVariety && active && !activeSacks.length ? (
              <Pressable accessibilityLabel={`Quitar lote ${letter(activeIndex)}`} accessibilityRole="button" disabled={locked} onPress={() => props.onRemoveVariety?.(active.id)} style={p.remove}>
                <SymbolView fallback={null} name={{ android: 'delete_sweep', ios: 'trash', web: 'delete_sweep' }} size={16} tintColor={color.danger} />
                <Text style={p.removeText}>Quitar lote</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={s.gridHeader}>
          <View style={p.gridTitle}>
            <Text accessibilityRole="header" style={s.overline}>PESAJE DE SACOS INDIVIDUALES (KG)</Text>
            <Text style={p.gridHint}>{props.weighingLocked ? '· Pesaje cerrado: el detalle queda bloqueado' : '· Escribe el peso bruto en la celda; toca un saco para corregirlo'}</Text>
          </View>
          <View style={s.goTo}>
            <SheetInput accessibilityLabel="Número del saco" keyboardType="number-pad" onChangeText={(value) => { setTarget(value); setTargetMessage(null); }} onSubmitEditing={goToSack} placeholder="Ir al saco N.°" returnKeyType="go" style={p.goToInput} value={target} />
            <Pressable accessibilityLabel="Ir al saco" accessibilityRole="button" disabled={!props.sacks.length} onPress={goToSack} style={({ pressed }) => [p.goToButton, (pressed || !props.sacks.length) && s.dimmed]}><SymbolView fallback={null} name={{ android: 'search', ios: 'magnifyingglass', web: 'search' }} size={18} tintColor={color.brand} /></Pressable>
            <View style={s.countBadge}><Text style={s.countBadgeText}>{activeSacks.length} de {activeSacks.length} {sackWord(activeSacks.length)} registrados</Text></View>
          </View>
        </View>
        {targetMessage ? <Text accessibilityLiveRegion="polite" style={s.targetMessage}>{targetMessage}</Text> : null}

        <View style={s.gridBox}>
          {rows.length ? null : <Text style={s.empty}>{active ? 'Escribe el peso bruto del primer saco.' : 'Todavía no hay variedades en esta compra.'}</Text>}
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
            {rows.slice(windowStart, windowEnd).map((row) => (
              <View key={row[0]!.kind === 'sack' ? row[0]!.sack.id : 'draft'} style={s.gridRow}>
                {row.map((cell) => {
                  if (cell.kind === 'draft') {
                    return (
                      <View key="draft" style={[s.cell, p.cellDraft]} testID="sack-draft">
                        <View style={[s.cellNumber, p.cellNumberDraft]}><Text style={s.cellNumberText}>{String(nextSequence).padStart(2, '0')}</Text></View>
                        <SheetInput accessibilityLabel="Peso bruto (kg)" editable={captureEditable} keyboardType="number-pad" onChangeText={props.onGrossChange} onSubmitEditing={canAdd ? props.onSaveSack : undefined} placeholder="0" returnKeyType="done" style={p.cellInput} submitBehavior="submit" value={props.gross} />
                        <Text style={s.cellUnit}>kg</Text>
                      </View>
                    );
                  }
                  const { sack } = cell;
                  const current = sack.sequence === props.editingSequence;
                  if (current) {
                    return (
                      <View key={sack.id} style={[s.cell, s.cellHighlighted]} testID={`sack-${sack.sequence}`}>
                        <View style={s.cellNumber}><Text style={s.cellNumberText}>{String(sack.sequence).padStart(2, '0')}</Text></View>
                        <SheetInput accessibilityLabel="Peso bruto (kg)" autoFocus editable={captureEditable} keyboardType="number-pad" onChangeText={props.onGrossChange} onSubmitEditing={canAdd ? props.onSaveSack : undefined} returnKeyType="done" style={p.cellInput} submitBehavior="submit" value={props.gross} />
                        <Text style={s.cellUnit}>kg</Text>
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
          <View style={p.addRow} testID="sheet-capture">
            <Pressable accessibilityLabel={props.busy ? 'Guardando saco' : editing ? 'Guardar corrección' : 'Añadir saco'} accessibilityRole="button" disabled={!canAdd} onPress={props.onSaveSack} style={({ pressed }) => [p.addSack, (pressed || !canAdd) && s.dimmed]} testID="add-sack">
              <SymbolView fallback={null} name={{ android: 'add_circle', ios: 'plus.circle', web: 'add_circle' }} size={18} tintColor={accent.emerald.ink} />
              <Text style={p.addSackText}>{props.busy ? 'Guardando…' : editing ? `Guardar corrección del saco ${props.editingSequence}` : '+ Añadir 1 saco'}</Text>
            </Pressable>
            <View style={p.tareBox}>
              <SymbolView fallback={null} name={{ android: 'scale', ios: 'scalemass', web: 'scale' }} size={18} tintColor={accent.emerald.pillInk} />
              <Text style={p.tareLabel}>{editing ? `Tara del saco ${props.editingSequence}` : 'Tara por saco'}</Text>
              <SheetInput accessibilityLabel="Tara (kg)" editable={captureEditable} keyboardType="number-pad" onChangeText={props.onTareChange} placeholder="0" style={p.tareInput} value={props.tare} />
              <Text style={p.tareUnit}>kg</Text>
              {editing ? <Pressable accessibilityLabel="Cancelar corrección" accessibilityRole="button" disabled={locked} onPress={props.onCancelEdit} style={p.cancel}><Text style={p.cancelText}>Cancelar</Text></Pressable> : null}
            </View>
          </View>
        )}

        <View style={p.subtotal}>
          <View style={s.subtotalCopy}>
            <SymbolView fallback={null} name={{ android: 'scale', ios: 'scalemass', web: 'scale' }} size={22} tintColor={accent.emerald.ink} />
            <Text style={s.subtotalTitle}>SUBTOTAL LOTE {active ? letter(activeIndex) : ''}</Text>
            <Text style={s.help}>({activeSacks.length} {sackWord(activeSacks.length)} con peso)</Text>
          </View>
          <View style={s.subtotalWeight}>
            <Text style={s.help}>Peso total lote:</Text>
            <Text accessibilityLabel={`Peso total del lote: ${formatKilograms(gramsToKg(activeKilograms))}`} style={s.subtotalValue}>{formatKilograms(gramsToKg(activeKilograms)).replace(' kg', '')}</Text>
            <Text style={p.kgUnit}>kg</Text>
          </View>
        </View>
      </View>

      <Pressable accessibilityLabel="Ver cálculo consolidado y liquidación comercial" accessibilityRole="button" onPress={() => screenRef.current?.scrollTo({ animated: true, y: tableY.current })} style={({ pressed }) => [p.jump, pressed && s.dimmed]}>
        <Text style={p.jumpText}>VER CÁLCULO CONSOLIDADO Y LIQUIDACIÓN COMERCIAL</Text>
        <SymbolView fallback={null} name={{ android: 'arrow_downward', ios: 'arrow.down', web: 'arrow_downward' }} size={18} tintColor={accent.emerald.pillInk} />
      </Pressable>

      <View onLayout={(event) => { tableY.current = event.nativeEvent.layout.y; }} style={s.card} testID="sheet-table">
        <View style={s.sectionHeader}>
          <View style={s.sectionTitleRow}>
            <View style={p.bullet} />
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
            <View key={lot.key} style={[s.tableRow, current && p.rowActive]} testID={`lot-${lot.letter}`}>
              <View style={s.colLot}><View style={[s.lotTag, !current && p.lotTagIdle]}><Text style={[s.lotTagText, !current && p.lotTagTextIdle]}>Lote {lot.letter}</Text></View></View>
              <View style={s.colVariety}>
                <SheetInput accessibilityLabel={`Nombre del lote ${lot.letter} (opcional)`} editable={!locked} maxLength={60} onChangeText={(value) => props.onChangeLot(lot.key, 'name', value)} placeholder={described} style={s.tableInput} value={draftLot.name} />
              </View>
              <View style={s.colSacks}><View style={s.sacksPill}><Text style={s.sacksPillText}>{lot.sacks} {sackWord(lot.sacks)}</Text></View></View>
              <View style={s.colWeight}><View style={s.weightPill}><Text style={s.weightPillText}>{formatKilograms(lot.netWeightKg)}</Text></View></View>
              <View style={[s.colPrice, s.priceCell]}>
                <SheetInput accessibilityLabel={draftLot.priceBasis === 'kilogram' ? `Precio por kilogramo, lote ${lot.letter} (S/)` : `Precio por saco, lote ${lot.letter} (S/)`} editable={!locked} keyboardType="decimal-pad" onChangeText={(value) => props.onChangeLot(lot.key, 'unitPrice', value)} placeholder="0.00" style={[s.tableInput, s.priceInput]} value={draftLot.unitPrice} />
                <View accessibilityRole="radiogroup" style={p.basis}>
                  {([['kilogram', 'kg', 'por kilogramo'], ['sack', 'saco', 'por saco']] as const).map(([value, short, long]) => (
                    <Pressable accessibilityLabel={`Lote ${lot.letter}: ${long}`} accessibilityRole="radio" accessibilityState={{ checked: draftLot.priceBasis === value }} disabled={locked} key={value} onPress={() => props.onChangeLot(lot.key, 'priceBasis', value)} style={[p.basisOption, draftLot.priceBasis === value && s.basisSelected]}>
                      <Text style={[p.basisText, draftLot.priceBasis === value && s.onBrand]}>{short}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <Text accessibilityLabel={`Importe del lote ${lot.letter}: ${amount ? formatPreviewMoney(amount) : 'Pendiente'}`} style={[s.amount, s.colAmount]}>{amount ? formatPreviewMoney(amount) : 'Pendiente'}</Text>
            </View>
          );
        }) : <Text style={s.empty}>Los lotes aparecen al registrar el primer saco.</Text>}
        <View style={p.totals}>
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
          <View accessibilityRole="radiogroup" style={p.segment}>
            {([['none', 'Sin flete'], ['sack', 'Por sacos'], ['kilogram', 'Por kilaje']] as const).map(([value, label]) => (
              <Pressable accessibilityLabel={`Flete: ${label.toLowerCase()}`} accessibilityRole="radio" accessibilityState={{ checked: values.freightBasis === value }} disabled={locked} key={value} onPress={() => props.onChange('freightBasis', value)} style={[p.segmentOption, values.freightBasis === value && p.segmentSelected]}>
                <Text style={[p.segmentText, values.freightBasis === value && s.onBrand]}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        {values.freightBasis === 'none' ? <Text style={s.help}>Esta compra no lleva flete.</Text> : (
          <View style={s.freightRow}>
            <View style={s.freightChip}>
              <Text style={s.freightQuantity}>{values.freightBasis === 'sack' ? `${totalSacks}` : formatKilograms(gramsToKg(totalGrams)).replace(' kg', '')}</Text>
              <Text style={p.freightUnit}>{values.freightBasis === 'sack' ? sackWord(totalSacks) : 'kg'}</Text>
              <Text style={s.freightTimes}>× S/</Text>
              <SheetInput accessibilityLabel="Tarifa de flete (S/)" editable={!locked} keyboardType="decimal-pad" onChangeText={(value) => props.onChange('freightRate', value)} placeholder="0.00" style={s.freightInput} value={values.freightRate} />
            </View>
            <Text style={[s.help, s.grow]}>Tarifa por unidad seleccionada</Text>
            <Text style={p.freightLabel}>SUBTOTAL FLETE:</Text>
            <Text accessibilityLabel={`Subtotal de flete: ${money('freightCents')}`} style={s.freightAmount}>{money('freightCents')}</Text>
          </View>
        )}
        <View style={p.freightMore}>
          <View style={p.vehicle}><SelectionField appearance="stitch" disabled={props.detailsLocked || locked} label="Vehículo (opcional)" leadingIcon="local_shipping" onPress={props.onSelectVehicle} placeholder="Seleccionar placa" value={props.details.vehiclePlate} /></View>
          {values.freightBasis !== 'none' ? (
            <View style={p.payer}>
              <Text style={p.payerLabel}>¿QUIÉN ASUME EL FLETE?</Text>
              <View accessibilityRole="radiogroup" style={p.segment}>
                {([['provider', 'Se descuenta al proveedor'], ['wholesaler', 'Lo paga el Mayorista']] as const).map(([value, label]) => (
                  <Pressable accessibilityLabel={label} accessibilityRole="radio" accessibilityState={{ checked: values.freightChargedTo === value }} disabled={locked} key={value} onPress={() => props.onChange('freightChargedTo', value)} style={[p.segmentOption, values.freightChargedTo === value && p.segmentSelected]}>
                    <Text style={[p.segmentText, values.freightChargedTo === value && s.onBrand]}>{label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
        </View>
        {wholesalerFreight ? <Text style={s.help}>No se descuenta del proveedor; queda como flete pendiente con el transportista.</Text> : null}
      </View>

      <View style={s.card} testID="sheet-summary">
        <View style={[s.sectionHeader, p.summaryHead]}>
          <View style={s.sectionTitleRow}>
            <SymbolView fallback={null} name={{ android: 'account_balance_wallet', ios: 'wallet.pass', web: 'account_balance_wallet' }} size={22} tintColor={color.brand} />
            <Text accessibilityRole="header" style={s.sectionTitle}>Resumen de liquidación</Text>
          </View>
          <Text style={s.balance}>BALANCE COMERCIAL</Text>
        </View>
        <View style={p.summary}>
          <View style={p.summaryLeft}>
            <Line label="Total pago (producto):" value={money('grossCents')} />
            <Line label={wholesalerFreight ? 'Flete a cargo del Mayorista (no se descuenta)' : 'Total flete (descuento):'} value={values.freightBasis === 'none' ? 'S/ 0.00' : wholesalerFreight || preview.kind !== 'ready' ? money('freightCents') : `- ${money('freightCents')}`} />
            <View style={p.line}>
              <Text style={p.lineLabel}>Otros cargos / ajustes:</Text>
              <Text style={p.currency}>S/</Text>
              <SheetInput accessibilityLabel="Otros descuentos (S/)" editable={!locked} keyboardType="decimal-pad" onChangeText={(value) => props.onChange('discounts', value)} placeholder="0.00" style={p.lineInput} value={values.discounts} />
            </View>
          </View>
          <View style={p.summaryRight}>
            <View style={p.advance}>
              <Text style={p.payerLabel}>ADELANTO ENTREGADO:</Text>
              <Text style={p.currency}>S/</Text>
              <SheetInput accessibilityLabel="Adelantos (S/)" editable={!locked} keyboardType="decimal-pad" onChangeText={(value) => props.onChange('advances', value)} placeholder="0.00" style={p.lineInput} value={values.advances} />
            </View>
            <View style={p.net}>
              <View>
                <Text style={p.netTitle}>TOTAL NETO A LIQUIDAR</Text>
                <Text style={p.netHelp}>{values.paymentMode === 'cash' ? 'Saldo a pagar en mano' : 'Saldo a crédito, en cuotas'}</Text>
              </View>
              <Text accessibilityLabel={`Total neto a liquidar: ${money('liquidCents')}`} style={p.netValue}>{money('liquidCents')}</Text>
            </View>
            <View style={p.payment}>
              <Text style={p.payerLabel}>FORMA DE PAGO</Text>
              <View accessibilityRole="radiogroup" style={p.segment}>
                {([['cash', 'Contado'], ['credit', 'Crédito']] as const).map(([value, label]) => (
                  <Pressable accessibilityLabel={label} accessibilityRole="radio" accessibilityState={{ checked: values.paymentMode === value }} disabled={locked} key={value} onPress={() => props.onChange('paymentMode', value)} style={[p.segmentOption, values.paymentMode === value && p.segmentSelected]}>
                    <Text style={[p.segmentText, values.paymentMode === value && s.onBrand]}>{label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </View>
        {values.paymentMode === 'credit' ? <PaymentTermsFields isSubmitting={locked} onAddInstallment={props.onAddInstallment} onChange={props.onChange} onChangeInstallment={props.onChangeInstallment} onRemoveInstallment={props.onRemoveInstallment} values={values} /> : null}
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

      <Modal animationType="fade" onRequestClose={() => setCharacteristicsOpen(false)} transparent visible={characteristicsOpen}>
        <View style={p.modalBackdrop}>
          <View style={p.modal}>
            <Text accessibilityRole="header" style={s.sectionTitle}>Calidad y procedencia de los próximos sacos</Text>
            {props.characteristics}
            <Pressable accessibilityLabel="Listo" accessibilityRole="button" onPress={() => setCharacteristicsOpen(false)} style={[s.save, p.modalDone]}><Text style={s.saveText}>Listo</Text></Pressable>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

function BigTotal({ accessibilityLabel, label, strong = false, unit, value }: { accessibilityLabel?: string; label: string; strong?: boolean; unit?: string; value: string }) {
  return (
    <View accessibilityLabel={accessibilityLabel ?? `${label} ${value}${unit ? ` ${unit}` : ''}`} accessible style={[p.bigTotal, strong && p.bigTotalStrong]}>
      <Text style={[p.bigTotalLabel, strong && p.bigTotalLabelStrong]}>{label}</Text>
      <View style={p.bigTotalValueLine}>
        <Text style={[p.bigTotalValue, strong && p.bigTotalValueStrong]}>{value}</Text>
        {unit ? <Text style={p.bigTotalUnit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={p.line}>
      <Text style={p.lineLabel}>{label}</Text>
      <View style={p.lineValueBox}><Text accessibilityLabel={`${label.replace(/:$/, "")}: ${value}`} style={p.lineValue}>{value}</Text></View>
    </View>
  );
}

// Styles of the purchase sheet that the sale sheet does not share.
const p = StyleSheet.create({
  details: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  detailWide: { flexBasis: 360, flexGrow: 2, minWidth: 0 },
  detail: { flexBasis: 170, flexGrow: 1, minWidth: 0 },
  detailLinks: { flexBasis: '100%' },
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
export function SheetInput({ onFocus, style, ...props }: TextInputProps) {
  const ref = useRef<TextInput>(null);
  const keyboard = useContext(KeyboardFocusContext);
  return (
    <TextInput
      onFocus={(event) => {
        keyboard?.focus(ref.current);
        onFocus?.(event);
      }}
      placeholderTextColor="#64748B"
      ref={ref}
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
  tabs: { alignItems: 'center', flexDirection: 'row', flexShrink: 1, flexWrap: 'wrap', gap: 10 },
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
