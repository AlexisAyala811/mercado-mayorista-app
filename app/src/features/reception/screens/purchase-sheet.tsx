import { SymbolView } from '@/ui/components/symbol';
import { useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { emptyLotDraft, formatPreviewMoney, type PurchaseLot, type PurchasePreview } from '@/domain/reception/purchase-preview';
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

// One sack in the grid. The cell shows the net weight; gross and tare are
// edited in the capture bar (CL-ST17).
export type SheetSack = { id: string; sequence: number; varietyId: string; netDisplay: string; detail: string };
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

// Compra on one screen (spec 011, RQ-ST13, CL-ST11): the Stitch «Registro de
// compra multilotes» layout: provider data, one tab per variety, the grid of
// sacks in five columns inside its own scroll area (200 or more sacks stay
// fluid: rows have a fixed height and only the visible ones are drawn), the
// consolidated table with
// the price of each lot, freight, the settlement summary and «Guardar compra».
export function PurchaseSheet(props: PurchaseSheetProps) {
  const { preview, values } = props;
  const gridRef = useRef<ScrollView>(null);
  const [firstRow, setFirstRow] = useState(0);
  const [target, setTarget] = useState('');
  const [targetMessage, setTargetMessage] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const locked = Boolean(props.busy || props.blocked);

  const active = props.varieties.find((variety) => variety.id === props.activeVarietyId) ?? props.varieties[0];
  const activeIndex = active ? props.varieties.indexOf(active) : -1;
  const activeSacks = useMemo(() => props.sacks.filter((sack) => sack.varietyId === active?.id), [active?.id, props.sacks]);
  const rows = useMemo(() => {
    const chunks: SheetSack[][] = [];
    for (let index = 0; index < activeSacks.length; index += sheetColumns) chunks.push(activeSacks.slice(index, index + sheetColumns));
    return chunks;
  }, [activeSacks]);
  // Window of rows drawn in the grid; the spacers keep the scroll height.
  const windowStart = Math.max(0, Math.min(firstRow, Math.max(0, rows.length - gridVisibleRows)) - gridOverscan);
  const windowEnd = Math.min(rows.length, windowStart + gridVisibleRows + gridOverscan * 2);
  const count = (varietyId: string) => props.sacks.reduce((total, sack) => total + (sack.varietyId === varietyId ? 1 : 0), 0);
  const activeLots = props.lots.filter((lot) => lot.varietyId === active?.id);
  const activeKilograms = activeLots.reduce((total, lot) => total + lot.grams, 0n);
  const totalSacks = props.lots.reduce((total, lot) => total + lot.sacks, 0);
  const totalGrams = props.lots.reduce((total, lot) => total + lot.grams, 0n);
  const nextSequence = props.sacks.reduce((max, sack) => Math.max(max, sack.sequence), 0) + 1;
  const canCapture = Boolean(active) && !props.weighingLocked && !locked;
  // The fields stay editable while a sack is being saved so the keyboard and
  // the focus are kept between sacks; saving is what waits.
  const captureEditable = Boolean(active) && !props.weighingLocked && !props.blocked;
  const canAdd = canCapture && props.gross.trim().length > 0;
  const money = (field: 'grossCents' | 'freightCents' | 'liquidCents') => (preview.kind === 'ready' ? formatPreviewMoney(preview[field]) : 'Pendiente');
  const canSave = !locked && props.sacks.length > 0 && preview.kind === 'ready';

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
    <AppScreen contentContainerStyle={sheetStyles.screen} testID="purchase-sheet">
      <AppHeader eyebrow="COMPRA · ANOTE" title="Compra" />
      {props.notice ? <FeedbackState title="Pendiente de confirmación central" message={props.notice} /> : null}
      {props.errorMessage ? <FeedbackState title="No se pudo completar la operación" message={props.errorMessage} tone="error" /> : null}

      <View style={sheetStyles.card} testID="sheet-details">
        <View style={sheetStyles.fields}>
          <View style={sheetStyles.fieldWide}><SelectionField appearance="stitch" disabled={props.detailsLocked || locked} label="Nombre del proveedor" onPress={props.onSelectProvider} placeholder="Seleccionar proveedor" value={props.details.providerName} /></View>
          <View style={sheetStyles.field}><FormField appearance="stitch" editable={!props.detailsLocked && !locked} keyboardType="phone-pad" label="N.° celular" onChangeText={(value) => props.onChangeDetail('providerPhone', value)} placeholder="Opcional" value={props.details.providerPhone} /></View>
          <View style={sheetStyles.field}><FormField appearance="stitch" editable={!props.detailsLocked && !locked} label="Fecha de compra" onChangeText={(value) => props.onChangeDetail('date', value)} placeholder="aaaa-mm-dd" value={props.details.date} /></View>
        </View>
        <View style={sheetStyles.fields}>
          <View style={sheetStyles.fieldWide}><FormField appearance="stitch" editable={!props.detailsLocked && !locked} label="Conductor" onChangeText={(value) => props.onChangeDetail('driverName', value)} placeholder="Nombre del conductor" value={props.details.driverName} /></View>
          <View style={sheetStyles.fieldWide}><SelectionField appearance="stitch" disabled={props.detailsLocked || locked} label="Vehículo (opcional)" onPress={props.onSelectVehicle} placeholder="Seleccionar placa" value={props.details.vehiclePlate} /></View>
        </View>
        {props.detailsLocked ? null : props.referenceActions}
      </View>

      <View style={[sheetStyles.card, sheetStyles.tabsCard]}>
        <View accessibilityRole="tablist" style={sheetStyles.tabs}>
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
                style={[sheetStyles.tab, selected && sheetStyles.tabSelected]}
                testID={`lot-tab-${letter(index)}`}>
                <View style={[sheetStyles.tabLetter, selected && sheetStyles.tabLetterSelected]}><Text style={[sheetStyles.tabLetterText, selected && sheetStyles.onBrand]}>{letter(index)}</Text></View>
                <Text numberOfLines={1} style={[sheetStyles.tabName, selected && sheetStyles.onBrand]}>{variety.name}</Text>
                <View style={[sheetStyles.tabCount, selected && sheetStyles.tabCountSelected]}><Text style={[sheetStyles.tabCountText, selected && sheetStyles.onBrand]}>{total} {sackWord(total)}</Text></View>
              </Pressable>
            );
          }) : <Text style={sheetStyles.help}>Añade la primera variedad para empezar a pesar.</Text>}
        </View>
        {props.onAddVariety ? (
          <Pressable accessibilityLabel="Añadir lote o variedad" accessibilityRole="button" disabled={locked} onPress={props.onAddVariety} style={({ pressed }) => [sheetStyles.addLot, (pressed || locked) && sheetStyles.dimmed]}>
            <SymbolView fallback={null} name={{ android: 'add_circle', ios: 'plus.circle', web: 'add_circle' }} size={20} tintColor={color.textOnBrand} />
            <Text style={sheetStyles.addLotText}>Añadir lote / variedad</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={sheetStyles.card} testID="sheet-lot">
        <View style={sheetStyles.lotHeader}>
          <View style={sheetStyles.lotChip}>
            <SymbolView fallback={null} name={{ android: 'inventory_2', ios: 'shippingbox', web: 'inventory_2' }} size={20} tintColor="#6EE7B7" />
            <Text numberOfLines={1} style={sheetStyles.lotChipText}>{active?.name ?? 'Sin variedad'}</Text>
          </View>
          {active ? <View style={sheetStyles.lotBadge}><Text style={sheetStyles.lotBadgeText}>Lote {letter(activeIndex)}</Text></View> : null}
        </View>

        <View style={sheetStyles.gridHeader}>
          <View style={sheetStyles.gridTitles}>
            <Text accessibilityRole="header" style={sheetStyles.overline}>PESAJE DE SACOS INDIVIDUALES (KG)</Text>
            <Text style={sheetStyles.help}>{props.weighingLocked ? 'Pesaje cerrado: el detalle queda bloqueado.' : 'Toca un saco para corregir su bruto y su tara.'}</Text>
          </View>
          <View style={sheetStyles.goTo}>
            <SheetInput accessibilityLabel="Número del saco" keyboardType="number-pad" onChangeText={(value) => { setTarget(value); setTargetMessage(null); }} onSubmitEditing={goToSack} placeholder="Ir al saco N.°" returnKeyType="go" style={sheetStyles.goToInput} value={target} />
            <Pressable accessibilityLabel="Ir al saco" accessibilityRole="button" disabled={!props.sacks.length} onPress={goToSack} style={({ pressed }) => [sheetStyles.goToButton, (pressed || !props.sacks.length) && sheetStyles.dimmed]}><Text style={sheetStyles.goToButtonText}>Ir</Text></Pressable>
            <View style={sheetStyles.countBadge}><Text style={sheetStyles.countBadgeText}>{activeSacks.length} {sackWord(activeSacks.length)} registrados</Text></View>
          </View>
        </View>
        {targetMessage ? <Text accessibilityLiveRegion="polite" style={sheetStyles.targetMessage}>{targetMessage}</Text> : null}

        <View style={sheetStyles.gridBox}>
          {rows.length ? null : <Text style={sheetStyles.empty}>{active ? 'Escribe el peso bruto del primer saco y añádelo.' : 'Todavía no hay variedades en esta compra.'}</Text>}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            onScroll={(event) => {
              const row = Math.floor(event.nativeEvent.contentOffset.y / sheetRowHeight);
              if (row !== firstRow) setFirstRow(row);
            }}
            ref={gridRef}
            scrollEventThrottle={32}
            style={sheetStyles.grid}
            testID="sack-grid">
            <View style={{ height: Math.max(0, windowStart) * sheetRowHeight }} />
            {rows.slice(windowStart, windowEnd).map((item) => (
              <View key={item[0]!.id} style={sheetStyles.gridRow}>
                {item.map((sack) => (
                  <Pressable
                    accessibilityHint={props.weighingLocked ? undefined : 'Corrige el bruto y la tara'}
                    accessibilityLabel={`Saco ${sack.sequence}: ${sack.netDisplay} kilos netos. ${sack.detail}`}
                    accessibilityRole="button"
                    disabled={props.weighingLocked || locked}
                    key={sack.id}
                    onPress={() => props.onEditSack(sack.id)}
                    style={({ pressed }) => [sheetStyles.cell, (sack.id === highlightedId || sack.sequence === props.editingSequence) && sheetStyles.cellHighlighted, pressed && sheetStyles.dimmed]}
                    testID={`sack-${sack.sequence}`}>
                    <View style={sheetStyles.cellNumber}><Text style={sheetStyles.cellNumberText}>{String(sack.sequence).padStart(2, '0')}</Text></View>
                    <View style={sheetStyles.cellValue}><Text style={sheetStyles.cellValueText}>{sack.netDisplay}</Text></View>
                    <Text style={sheetStyles.cellUnit}>kg</Text>
                  </Pressable>
                ))}
                {Array.from({ length: sheetColumns - item.length }, (_, index) => <View key={`gap-${index}`} style={[sheetStyles.cell, sheetStyles.cellGap]} />)}
              </View>
            ))}
            <View style={{ height: Math.max(0, rows.length - windowEnd) * sheetRowHeight }} />
          </ScrollView>
        </View>

        {props.weighingLocked ? null : (
          <View style={sheetStyles.capture} testID="sheet-capture">
            <View style={sheetStyles.captureRow}>
              <Text accessibilityRole="header" style={sheetStyles.captureTitle}>{props.editingSequence ? `Corregir saco ${props.editingSequence}` : `Saco ${nextSequence}`}</Text>
              <View style={sheetStyles.captureField}>
                <Text style={sheetStyles.captureLabel}>Peso bruto (kg)</Text>
                <SheetInput accessibilityLabel="Peso bruto (kg)" editable={captureEditable} keyboardType="number-pad" onChangeText={props.onGrossChange} onSubmitEditing={canAdd ? props.onSaveSack : undefined} placeholder="52" returnKeyType="done" submitBehavior="submit" style={sheetStyles.captureInput} value={props.gross} />
              </View>
              <View style={sheetStyles.captureField}>
                <Text style={sheetStyles.captureLabel}>Tara (kg)</Text>
                <SheetInput accessibilityLabel="Tara (kg)" editable={captureEditable} keyboardType="number-pad" onChangeText={props.onTareChange} placeholder="0" style={sheetStyles.captureInput} value={props.tare} />
              </View>
              <Pressable accessibilityLabel={props.busy ? 'Guardando saco' : props.editingSequence ? 'Guardar corrección' : 'Añadir saco'} accessibilityRole="button" disabled={!canAdd} onPress={props.onSaveSack} style={({ pressed }) => [sheetStyles.addSack, (pressed || !canAdd) && sheetStyles.dimmed]} testID="add-sack">
                <SymbolView fallback={null} name={{ android: 'add_circle', ios: 'plus.circle', web: 'add_circle' }} size={20} tintColor={accent.emerald.ink} />
                <Text style={sheetStyles.addSackText}>{props.busy ? 'Guardando…' : props.editingSequence ? 'Guardar corrección' : 'Añadir 1 saco'}</Text>
              </Pressable>
              {props.editingSequence ? <Pressable accessibilityLabel="Cancelar corrección" accessibilityRole="button" disabled={locked} onPress={props.onCancelEdit} style={sheetStyles.cancelEdit}><Text style={sheetStyles.cancelEditText}>Cancelar</Text></Pressable> : null}
            </View>
            <Text style={sheetStyles.help}>Kilos enteros. El neto se calcula como bruto menos tara.</Text>
            {props.characteristics}
          </View>
        )}

        <View style={sheetStyles.subtotal}>
          <View style={sheetStyles.subtotalCopy}>
            <SymbolView fallback={null} name={{ android: 'scale', ios: 'scalemass', web: 'scale' }} size={22} tintColor={accent.emerald.ink} />
            <Text style={sheetStyles.subtotalTitle}>SUBTOTAL LOTE {active ? letter(activeIndex) : ''}</Text>
            <Text style={sheetStyles.help}>({activeSacks.length} {sackWord(activeSacks.length)} con peso)</Text>
          </View>
          <View style={sheetStyles.subtotalWeight}>
            <Text style={sheetStyles.help}>Peso total lote:</Text>
            <Text accessibilityLabel={`Peso total del lote: ${formatKilograms(gramsToKg(activeKilograms))}`} style={sheetStyles.subtotalValue}>{formatKilograms(gramsToKg(activeKilograms))}</Text>
          </View>
        </View>
      </View>

      <View style={sheetStyles.card} testID="sheet-table">
        <View style={sheetStyles.sectionHeader}>
          <Text accessibilityRole="header" style={sheetStyles.sectionTitle}>Resultado de compra por variedad / lote</Text>
          <Text style={sheetStyles.help}>Cálculos acumulados</Text>
        </View>
        <View style={sheetStyles.tableHead}>
          <Text style={[sheetStyles.th, sheetStyles.colLot]}>LOTE</Text>
          <Text style={[sheetStyles.th, sheetStyles.colVariety]}>VARIEDAD</Text>
          <Text style={[sheetStyles.th, sheetStyles.colSacks]}>N.° SACOS</Text>
          <Text style={[sheetStyles.th, sheetStyles.colWeight]}>PESO TOTAL (KG)</Text>
          <Text style={[sheetStyles.th, sheetStyles.colPrice]}>PRECIO (S/)</Text>
          <Text style={[sheetStyles.th, sheetStyles.colAmount]}>SUBTOTAL (S/)</Text>
        </View>
        {props.lots.length ? props.lots.map((lot) => {
          const draft = values.lots[lot.key] ?? emptyLotDraft;
          const amount = preview.kind === 'ready' ? preview.lots.find((item) => item.key === lot.key)?.amountCents : undefined;
          const described = `${lot.varietyName}${lot.qualityName ? ` · ${lot.qualityName}` : ''}`;
          return (
            <View key={lot.key} style={sheetStyles.tableRow} testID={`lot-${lot.letter}`}>
              <View style={sheetStyles.colLot}><View style={sheetStyles.lotTag}><Text style={sheetStyles.lotTagText}>Lote {lot.letter}</Text></View></View>
              <View style={sheetStyles.colVariety}>
                <SheetInput accessibilityLabel={`Nombre del lote ${lot.letter} (opcional)`} editable={!locked} maxLength={60} onChangeText={(value) => props.onChangeLot(lot.key, 'name', value)} placeholder={described} style={sheetStyles.tableInput} value={draft.name} />
              </View>
              <View style={sheetStyles.colSacks}><View style={sheetStyles.sacksPill}><Text style={sheetStyles.sacksPillText}>{lot.sacks} {sackWord(lot.sacks)}</Text></View></View>
              <View style={sheetStyles.colWeight}><View style={sheetStyles.weightPill}><Text style={sheetStyles.weightPillText}>{formatKilograms(lot.netWeightKg)}</Text></View></View>
              <View style={[sheetStyles.colPrice, sheetStyles.priceCell]}>
                <View accessibilityRole="radiogroup" style={sheetStyles.basis}>
                  {([['kilogram', 'kg', 'por kilogramo'], ['sack', 'saco', 'por saco']] as const).map(([value, short, long]) => (
                    <Pressable accessibilityLabel={`Lote ${lot.letter}: ${long}`} accessibilityRole="radio" accessibilityState={{ checked: draft.priceBasis === value }} disabled={locked} key={value} onPress={() => props.onChangeLot(lot.key, 'priceBasis', value)} style={[sheetStyles.basisOption, draft.priceBasis === value && sheetStyles.basisSelected]}>
                      <Text style={[sheetStyles.basisText, draft.priceBasis === value && sheetStyles.onBrand]}>{short}</Text>
                    </Pressable>
                  ))}
                </View>
                <SheetInput accessibilityLabel={draft.priceBasis === 'kilogram' ? `Precio por kilogramo, lote ${lot.letter} (S/)` : `Precio por saco, lote ${lot.letter} (S/)`} editable={!locked} keyboardType="decimal-pad" onChangeText={(value) => props.onChangeLot(lot.key, 'unitPrice', value)} placeholder="0.00" style={[sheetStyles.tableInput, sheetStyles.priceInput]} value={draft.unitPrice} />
              </View>
              <Text accessibilityLabel={`Importe del lote ${lot.letter}: ${amount ? formatPreviewMoney(amount) : 'Pendiente'}`} style={[sheetStyles.amount, sheetStyles.colAmount]}>{amount ? formatPreviewMoney(amount) : 'Pendiente'}</Text>
            </View>
          );
        }) : <Text style={sheetStyles.empty}>Los lotes aparecen al registrar el primer saco.</Text>}
        <View style={sheetStyles.totals}>
          <Total label="Total sacos" value={`${totalSacks}`} />
          <Total label="Total kilaje" value={formatKilograms(gramsToKg(totalGrams))} />
          <Total label="Total compra" strong value={money('grossCents')} />
        </View>
      </View>

      <View style={sheetStyles.card} testID="sheet-freight">
        <View style={sheetStyles.sectionHeader}>
          <View style={sheetStyles.sectionTitleRow}>
            <SymbolView fallback={null} name={{ android: 'local_shipping', ios: 'truck.box', web: 'local_shipping' }} size={22} tintColor={color.brand} />
            <Text accessibilityRole="header" style={sheetStyles.sectionTitle}>Flete de transporte</Text>
          </View>
          <View accessibilityRole="radiogroup" style={sheetStyles.options}>
            {([['none', 'Sin flete'], ['sack', 'Por sacos'], ['kilogram', 'Por kilaje']] as const).map(([value, label]) => (
              <Option checked={values.freightBasis === value} disabled={locked} key={value} label={label} accessibilityLabel={`Flete: ${label.toLowerCase()}`} onPress={() => props.onChange('freightBasis', value)} />
            ))}
          </View>
        </View>
        {values.freightBasis === 'none' ? <Text style={sheetStyles.help}>Esta compra no lleva flete.</Text> : (
          <>
            <View style={sheetStyles.freightRow}>
              <View style={sheetStyles.freightChip}>
                <Text style={sheetStyles.freightQuantity}>{values.freightBasis === 'sack' ? `${totalSacks} ${sackWord(totalSacks)}` : formatKilograms(gramsToKg(totalGrams))}</Text>
                <Text style={sheetStyles.freightTimes}>× S/</Text>
                <SheetInput accessibilityLabel="Tarifa de flete (S/)" editable={!locked} keyboardType="decimal-pad" onChangeText={(value) => props.onChange('freightRate', value)} placeholder="0.00" style={sheetStyles.freightInput} value={values.freightRate} />
              </View>
              <Text style={[sheetStyles.help, sheetStyles.grow]}>Tarifa por {values.freightBasis === 'sack' ? 'saco' : 'kilogramo'}</Text>
              <Text style={sheetStyles.help}>SUBTOTAL FLETE:</Text>
              <Text accessibilityLabel={`Subtotal de flete: ${money('freightCents')}`} style={sheetStyles.freightAmount}>{money('freightCents')}</Text>
            </View>
            <View style={sheetStyles.freightRow}>
              <Text style={sheetStyles.captureLabel}>¿Quién asume el flete?</Text>
              <View accessibilityRole="radiogroup" style={sheetStyles.options}>
                {([['provider', 'Se descuenta al proveedor'], ['wholesaler', 'Lo paga el Mayorista']] as const).map(([value, label]) => (
                  <Option checked={values.freightChargedTo === value} disabled={locked} key={value} label={label} onPress={() => props.onChange('freightChargedTo', value)} />
                ))}
              </View>
            </View>
            {values.freightChargedTo === 'wholesaler' ? <Text style={sheetStyles.help}>No se descuenta del proveedor; queda como flete pendiente con el transportista.</Text> : null}
          </>
        )}
      </View>

      <View style={sheetStyles.card} testID="sheet-summary">
        <View style={sheetStyles.sectionHeader}>
          <View style={sheetStyles.sectionTitleRow}>
            <SymbolView fallback={null} name={{ android: 'account_balance_wallet', ios: 'wallet.pass', web: 'account_balance_wallet' }} size={22} tintColor={color.brand} />
            <Text accessibilityRole="header" style={sheetStyles.sectionTitle}>Resumen de liquidación</Text>
          </View>
          <Text style={sheetStyles.balance}>BALANCE COMERCIAL</Text>
        </View>
        <SummaryLine label="Total pago (producto)" value={money('grossCents')} />
        <SummaryLine label={values.freightBasis !== 'none' && values.freightChargedTo === 'wholesaler' ? 'Flete a cargo del Mayorista (no se descuenta)' : 'Total flete (descuento)'} value={values.freightBasis === 'none' ? 'S/ 0.00' : money('freightCents')} />
        <View style={sheetStyles.summaryLine}>
          <Text style={sheetStyles.summaryLabel}>Otros cargos / ajustes (S/)</Text>
          <SheetInput accessibilityLabel="Otros descuentos (S/)" editable={!locked} keyboardType="decimal-pad" onChangeText={(value) => props.onChange('discounts', value)} placeholder="0.00" style={sheetStyles.summaryInput} value={values.discounts} />
        </View>
        <View style={sheetStyles.summaryLine}>
          <Text style={sheetStyles.summaryLabel}>Adelanto entregado (S/)</Text>
          <SheetInput accessibilityLabel="Adelantos (S/)" editable={!locked} keyboardType="decimal-pad" onChangeText={(value) => props.onChange('advances', value)} placeholder="0.00" style={sheetStyles.summaryInput} value={values.advances} />
        </View>
        <PaymentTermsFields isSubmitting={locked} onAddInstallment={props.onAddInstallment} onChange={props.onChange} onChangeInstallment={props.onChangeInstallment} onRemoveInstallment={props.onRemoveInstallment} values={values} />
        <View style={sheetStyles.net}>
          <View>
            <Text style={sheetStyles.netTitle}>Total neto a liquidar</Text>
            <Text style={sheetStyles.netHelp}>{values.paymentMode === 'cash' ? 'Saldo a pagar al contado' : 'Saldo a crédito, en cuotas'}</Text>
          </View>
          <Text accessibilityLabel={`Total neto a liquidar: ${money('liquidCents')}`} style={sheetStyles.netValue}>{money('liquidCents')}</Text>
        </View>
        {preview.kind !== 'ready' && props.sacks.length ? <FeedbackState title={preview.kind === 'invalid' ? 'Revisa la liquidación' : 'Importes pendientes'} message={preview.message} tone={preview.kind === 'invalid' ? 'error' : undefined} /> : null}
        <Text style={sheetStyles.help}>Importes provisionales: el servidor los verifica al guardar y registra la compra, el flete y la caja o la cuenta por pagar.</Text>
      </View>

      <View style={sheetStyles.actions}>
        {props.onClear ? (
          <Pressable accessibilityLabel="Limpiar registro" accessibilityRole="button" disabled={locked} onPress={props.onClear} style={({ pressed }) => [sheetStyles.clear, (pressed || locked) && sheetStyles.dimmed]}>
            <SymbolView fallback={null} name={{ android: 'restart_alt', ios: 'arrow.counterclockwise', web: 'restart_alt' }} size={22} tintColor={color.brand} />
            <Text style={sheetStyles.clearText}>Limpiar registro</Text>
          </Pressable>
        ) : null}
        <Pressable accessibilityLabel="Guardar compra" accessibilityRole="button" disabled={!canSave} onPress={props.onSave} style={({ pressed }) => [sheetStyles.save, (pressed || !canSave) && sheetStyles.dimmed]} testID="save-purchase">
          <SymbolView fallback={null} name={{ android: 'check_circle', ios: 'checkmark.circle', web: 'check_circle' }} size={22} tintColor="#6EE7B7" />
          <Text style={sheetStyles.saveText}>{props.busy ? 'Guardando…' : 'Guardar compra'}</Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}

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
