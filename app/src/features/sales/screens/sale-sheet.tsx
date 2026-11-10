import { SymbolView } from 'expo-symbols';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { formatMoney } from '@/domain/reception/reception';
import type { SalePreview } from '@/domain/sales/sale-preview';
import { saleLineGrams, type SaleLineDraft } from '@/domain/sales/sale';
import { gramsToKg, Option, sheetColumns, sheetRowHeight, SheetInput, sheetStyles as s, SummaryLine, Total } from '@/features/reception/screens/purchase-sheet';
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

// Venta on one screen (spec 011, RQ-ST14, CL-ST18, CL-ST19): the Stitch
// «Registro de venta multilotes» layout: buyer data, one tab per lot, the
// sacks weighed one by one in five columns, the consolidated table with the
// price of each lot, freight, the summary and «Guardar venta». Each lot is
// sent as one line with its sacks and the sum of their weights.
export function SaleSheet(props: SaleSheetProps) {
  const { preview } = props;
  const gridRef = useRef<ScrollView>(null);
  const [firstRow, setFirstRow] = useState(0);
  const [weight, setWeight] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const busy = Boolean(props.busy);
  const activeIndex = Math.max(0, props.lines.findIndex((line) => line.id === props.activeLineId));
  const active = props.lines[activeIndex];
  const weights = useMemo(() => active?.weights ?? [], [active]);
  const rows = useMemo(() => {
    const chunks: { index: number; value: string }[][] = [];
    for (let index = 0; index < weights.length; index += sheetColumns) chunks.push(weights.slice(index, index + sheetColumns).map((value, offset) => ({ index: index + offset, value })));
    return chunks;
  }, [weights]);
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

  return (
    <AppScreen contentContainerStyle={s.screen} testID="sale-sheet">
      <AppHeader eyebrow="MÓDULO DE VENTA" subtitle="Despacho y pesaje en cancha" title="Venta" />
      {props.notice}
      {props.errorMessage ? <FeedbackState title="Revisa la operación" message={props.errorMessage} tone="error" /> : null}

      <View style={s.card} testID="sale-buyer">
        <View style={s.fields}>
          <View style={s.fieldWide}><SelectionField appearance="stitch" disabled={busy} label="Nombre del cliente / comprador" onPress={props.onSelectBuyer} placeholder="Selecciona un comprador" value={props.buyerName} /></View>
          <View style={s.field}><FormField appearance="stitch" editable={false} label="N.° celular" value={props.buyerPhone ?? '—'} /></View>
          <View style={s.field}><FormField appearance="stitch" editable={false} label="Fecha despacho" value={props.dispatchDate} /></View>
        </View>
        <View style={s.fields}>
          <View style={s.field}><FormField appearance="stitch" editable={!busy} label="Departamento de destino" onChangeText={props.onDestinationChange} value={props.destination} /></View>
          <View style={s.field}><SelectionField appearance="stitch" disabled={busy} label="Vehículo" onPress={props.onSelectVehicle} placeholder="Opcional" value={props.vehiclePlate} /></View>
          <View style={s.field}><FormField appearance="stitch" editable={!busy} label="Conductor" onChangeText={props.onDriverChange} value={props.driver} /></View>
        </View>
        {props.referenceActions}
      </View>

      <View style={[s.card, s.tabsCard]}>
        <View accessibilityRole="tablist" style={s.tabs}>
          {props.lines.length ? props.lines.map((line, index) => {
            const selected = index === activeIndex;
            const count = line.weights?.length ?? 0;
            return (
              <Pressable accessibilityLabel={`Lote ${letter(index)}: ${props.lineName(line)}, ${count} ${sackWord(count)}`} accessibilityRole="tab" accessibilityState={{ selected }} key={line.id} onPress={() => { props.onSelectLine(line.id); setEditing(null); setWeight(''); }} style={[s.tab, selected && s.tabSelected]} testID={`lot-tab-${letter(index)}`}>
                <View style={[s.tabLetter, selected && s.tabLetterSelected]}><Text style={[s.tabLetterText, selected && s.onBrand]}>{letter(index)}</Text></View>
                <Text numberOfLines={1} style={[s.tabName, selected && s.onBrand]}>{props.lineName(line)}</Text>
                <View style={[s.tabCount, selected && s.tabCountSelected]}><Text style={[s.tabCountText, selected && s.onBrand]}>{count} {sackWord(count)}</Text></View>
              </Pressable>
            );
          }) : <Text style={s.help}>Añade el primer lote para empezar a pesar.</Text>}
        </View>
        <Pressable accessibilityLabel="Añadir lote o variedad" accessibilityRole="button" disabled={busy} onPress={props.onAddLot} style={({ pressed }) => [s.addLot, (pressed || busy) && s.dimmed]}>
          <SymbolView fallback={null} name={{ android: 'add_circle', ios: 'plus.circle', web: 'add_circle' }} size={20} tintColor={color.textOnBrand} />
          <Text style={s.addLotText}>Añadir lote / variedad</Text>
        </Pressable>
      </View>

      {active ? (
        <View style={s.card} testID="sale-lot">
          <View style={s.lotHeader}>
            <View style={s.lotChip}>
              <SymbolView fallback={null} name={{ android: 'inventory_2', ios: 'shippingbox', web: 'inventory_2' }} size={20} tintColor="#6EE7B7" />
              <Text numberOfLines={1} style={s.lotChipText}>{props.lineName(active)}</Text>
            </View>
            <View style={{ alignItems: 'center', flexDirection: 'row', gap: 12 }}>
              <View style={s.lotBadge}><Text style={s.lotBadgeText}>Lote {letter(activeIndex)}</Text></View>
              {props.onRemoveLot && !weights.length ? (
                <Pressable accessibilityLabel={`Quitar lote ${letter(activeIndex)}`} accessibilityRole="button" disabled={busy} onPress={() => props.onRemoveLot?.(active.id)} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }}>
                  <Text style={{ color: color.danger, fontSize: 13, fontWeight: '600' }}>Quitar lote</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
          {props.lotCharacteristics}
          <View style={s.gridHeader}>
            <View style={s.gridTitles}>
              <Text accessibilityRole="header" style={s.overline}>PESAJE DE SACOS INDIVIDUALES (KG)</Text>
              <Text style={s.help}>Toca un saco para corregir su peso.</Text>
            </View>
            <View style={s.countBadge}><Text style={s.countBadgeText}>{weights.length} {sackWord(weights.length)} registrados</Text></View>
          </View>
          <View style={s.gridBox}>
            {rows.length ? null : <Text style={s.empty}>Escribe el peso del primer saco y añádelo.</Text>}
            <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled onScroll={(event) => { const row = Math.floor(event.nativeEvent.contentOffset.y / sheetRowHeight); if (row !== firstRow) setFirstRow(row); }} ref={gridRef} scrollEventThrottle={32} style={s.grid} testID="sale-grid">
              <View style={{ height: windowStart * sheetRowHeight }} />
              {rows.slice(windowStart, windowEnd).map((row) => (
                <View key={row[0]!.index} style={s.gridRow}>
                  {row.map((sack) => (
                    <Pressable accessibilityHint="Corrige el peso" accessibilityLabel={`Saco ${sack.index + 1}: ${sack.value} kilos`} accessibilityRole="button" disabled={busy} key={sack.index} onPress={() => { setEditing(sack.index); setWeight(sack.value); }} style={({ pressed }) => [s.cell, editing === sack.index && s.cellHighlighted, pressed && s.dimmed]} testID={`sale-sack-${sack.index + 1}`}>
                      <View style={s.cellNumber}><Text style={s.cellNumberText}>{String(sack.index + 1).padStart(2, '0')}</Text></View>
                      <View style={s.cellValue}><Text style={s.cellValueText}>{sack.value}</Text></View>
                      <Text style={s.cellUnit}>kg</Text>
                    </Pressable>
                  ))}
                  {Array.from({ length: sheetColumns - row.length }, (_, index) => <View key={`gap-${index}`} style={[s.cell, s.cellGap]} />)}
                </View>
              ))}
              <View style={{ height: Math.max(0, rows.length - windowEnd) * sheetRowHeight }} />
            </ScrollView>
          </View>
          <View style={s.capture} testID="sale-capture">
            <View style={s.captureRow}>
              <Text accessibilityRole="header" style={s.captureTitle}>{editing !== null ? `Corregir saco ${editing + 1}` : `Saco ${weights.length + 1}`}</Text>
              <View style={s.captureField}>
                <Text style={s.captureLabel}>Peso (kg)</Text>
                <SheetInput accessibilityLabel="Peso del saco (kg)" editable={!busy} keyboardType="number-pad" onChangeText={setWeight} onSubmitEditing={saveSack} placeholder="50" returnKeyType="done" style={s.captureInput} submitBehavior="submit" value={weight} />
              </View>
              <Pressable accessibilityLabel={editing !== null ? 'Guardar corrección' : 'Añadir saco'} accessibilityRole="button" disabled={!canAdd} onPress={saveSack} style={({ pressed }) => [s.addSack, (pressed || !canAdd) && s.dimmed]} testID="sale-add-sack">
                <SymbolView fallback={null} name={{ android: 'add_circle', ios: 'plus.circle', web: 'add_circle' }} size={20} tintColor={accent.emerald.ink} />
                <Text style={s.addSackText}>{editing !== null ? 'Guardar corrección' : 'Añadir 1 saco'}</Text>
              </Pressable>
              {editing !== null ? <Pressable accessibilityLabel="Cancelar corrección" accessibilityRole="button" onPress={() => { setEditing(null); setWeight(''); }} style={s.cancelEdit}><Text style={s.cancelEditText}>Cancelar</Text></Pressable> : null}
            </View>
            <Text style={s.help}>Kilos enteros por saco.</Text>
          </View>
          <View style={s.subtotal}>
            <View style={s.subtotalCopy}>
              <SymbolView fallback={null} name={{ android: 'scale', ios: 'scalemass', web: 'scale' }} size={22} tintColor={accent.emerald.ink} />
              <Text style={s.subtotalTitle}>SUBTOTAL LOTE {letter(activeIndex)}</Text>
              <Text style={s.help}>({weights.length} {sackWord(weights.length)} con peso)</Text>
            </View>
            <View style={s.subtotalWeight}>
              <Text style={s.help}>Peso total lote:</Text>
              <Text style={s.subtotalValue}>{formatKilograms(gramsToKg(saleLineGrams(active)))}</Text>
            </View>
          </View>
        </View>
      ) : null}

      <View style={s.card} testID="sale-table">
        <View style={s.sectionHeader}>
          <Text accessibilityRole="header" style={s.sectionTitle}>Resultado de venta por variedad / lote / despacho</Text>
          <Text style={s.help}>Cálculos acumulados</Text>
        </View>
        <View style={s.tableHead}>
          <Text style={[s.th, s.colLot]}>LOTE</Text>
          <Text style={[s.th, s.colVariety]}>VARIEDAD PAPA</Text>
          <Text style={[s.th, s.colSacks]}>N.° SACOS</Text>
          <Text style={[s.th, s.colWeight]}>PESO TOTAL (KG)</Text>
          <Text style={[s.th, s.colPrice]}>PRECIO (S/)</Text>
          <Text style={[s.th, s.colAmount]}>SUBTOTAL (S/)</Text>
        </View>
        {props.lines.length ? props.lines.map((line, index) => {
          const count = line.weights?.length ?? 0;
          const amount = lineAmount(line);
          return (
            <View key={line.id} style={s.tableRow} testID={`sale-lot-${letter(index)}`}>
              <View style={s.colLot}><View style={s.lotTag}><Text style={s.lotTagText}>Lote {letter(index)}</Text></View></View>
              <Text numberOfLines={2} style={[s.colVariety, { color: color.textPrimary, fontSize: 15, fontWeight: '600' }]}>{props.lineName(line)}</Text>
              <View style={s.colSacks}><View style={s.sacksPill}><Text style={s.sacksPillText}>{count} {sackWord(count)}</Text></View></View>
              <View style={s.colWeight}><View style={s.weightPill}><Text style={s.weightPillText}>{formatKilograms(gramsToKg(saleLineGrams(line)))}</Text></View></View>
              <View style={[s.colPrice, s.priceCell]}>
                <View accessibilityRole="radiogroup" style={s.basis}>
                  {([['kilogram', 'kg', 'por kilogramo'], ['sack', 'saco', 'por saco']] as const).map(([value, short, long]) => (
                    <Pressable accessibilityLabel={`Lote ${letter(index)}: ${long}`} accessibilityRole="radio" accessibilityState={{ checked: line.priceBasis === value }} disabled={busy} key={value} onPress={() => props.onChangeLine(line.id, 'priceBasis', value)} style={[s.basisOption, line.priceBasis === value && s.basisSelected]}>
                      <Text style={[s.basisText, line.priceBasis === value && s.onBrand]}>{short}</Text>
                    </Pressable>
                  ))}
                </View>
                <SheetInput accessibilityLabel={`Precio ${line.priceBasis === 'kilogram' ? 'por kilogramo' : 'por saco'}, lote ${letter(index)} (S/)`} editable={!busy} keyboardType="decimal-pad" onChangeText={(value) => props.onChangeLine(line.id, 'unitPrice', value)} placeholder="0.00" style={[s.tableInput, s.priceInput]} value={line.unitPrice} />
              </View>
              <Text accessibilityLabel={`Importe del lote ${letter(index)}: ${amount === null ? 'Pendiente' : formatMoney(amount.toString())}`} style={[s.amount, s.colAmount]}>{amount === null ? 'Pendiente' : formatMoney(amount.toString())}</Text>
            </View>
          );
        }) : <Text style={s.empty}>Los lotes de la venta aparecen aquí.</Text>}
        <View style={s.totals}>
          <Total label="Total sacos" value={`${totalSacks}`} />
          <Total label="Total kilaje" value={formatKilograms(gramsToKg(totalGrams))} />
          <Total label="Total venta" strong value={money('grossCents')} />
        </View>
      </View>

      <View style={s.card} testID="sale-freight">
        <View style={s.sectionHeader}>
          <View style={s.sectionTitleRow}>
            <SymbolView fallback={null} name={{ android: 'local_shipping', ios: 'truck.box', web: 'local_shipping' }} size={22} tintColor={color.brand} />
            <Text accessibilityRole="header" style={s.sectionTitle}>Flete / estiba de carga (despacho)</Text>
          </View>
          <View accessibilityRole="radiogroup" style={s.options}>
            {([['none', 'Sin flete'], ['sack', 'Por sacos'], ['kilogram', 'Por kilaje']] as const).map(([value, label]) => (
              <Option accessibilityLabel={`Flete: ${label.toLowerCase()}`} checked={props.freightBasis === value} disabled={busy} key={value} label={label} onPress={() => props.onChange('freightBasis', value)} />
            ))}
          </View>
        </View>
        {props.freightBasis === 'none' ? <Text style={s.help}>Esta venta no lleva flete.</Text> : (
          <>
            <View style={s.freightRow}>
              <View style={s.freightChip}>
                <Text style={s.freightQuantity}>{props.freightBasis === 'sack' ? `${totalSacks} ${sackWord(totalSacks)}` : formatKilograms(gramsToKg(totalGrams))}</Text>
                <Text style={s.freightTimes}>× S/</Text>
                <SheetInput accessibilityLabel="Tarifa de flete (S/)" editable={!busy} keyboardType="decimal-pad" onChangeText={(value) => props.onChange('freightRate', value)} placeholder="0.00" style={s.freightInput} value={props.freightRate} />
              </View>
              <Text style={[s.help, s.grow]}>Tarifa por {props.freightBasis === 'sack' ? 'saco' : 'kilogramo'}</Text>
              <Text style={s.help}>SUBTOTAL FLETE:</Text>
              <Text accessibilityLabel={`Subtotal de flete: ${money('freightCents')}`} style={s.freightAmount}>{money('freightCents')}</Text>
            </View>
            <View style={s.freightRow}>
              <Text style={s.captureLabel}>¿Cómo se cobra el flete?</Text>
              <View accessibilityRole="radiogroup" style={s.options}>
                <Option checked={!props.freightIncluded} disabled={busy} label="Flete separado" onPress={() => props.onChange('freightIncluded', 'false')} />
                <Option checked={props.freightIncluded} disabled={busy} label="Incluir en total" onPress={() => props.onChange('freightIncluded', 'true')} />
              </View>
            </View>
          </>
        )}
      </View>

      <View style={s.card} testID="sale-summary">
        <View style={s.sectionHeader}>
          <View style={s.sectionTitleRow}>
            <SymbolView fallback={null} name={{ android: 'account_balance_wallet', ios: 'wallet.pass', web: 'account_balance_wallet' }} size={22} tintColor={color.brand} />
            <Text accessibilityRole="header" style={s.sectionTitle}>Resumen de liquidación</Text>
          </View>
          <Text style={s.balance}>BALANCE COMERCIAL</Text>
        </View>
        <SummaryLine label="Total cobro (producto)" value={money('grossCents')} />
        <SummaryLine label={props.freightIncluded ? 'Flete / estiba (cobro)' : 'Flete / estiba (separado, no suma)'} value={props.freightBasis === 'none' ? 'S/ 0.00' : money('freightCents')} />
        <View style={s.summaryLine}>
          <Text style={s.summaryLabel}>Otros cargos / ajustes (S/)</Text>
          <SheetInput accessibilityLabel="Descuentos (S/)" editable={!busy} keyboardType="decimal-pad" onChangeText={(value) => props.onChange('discounts', value)} placeholder="0.00" style={s.summaryInput} value={props.discounts} />
        </View>
        <View style={{ gap: 12 }}>
          <Text style={s.captureLabel}>Forma de pago</Text>
          <View accessibilityRole="radiogroup" style={s.options}>
            <Option checked={props.paymentMode === 'cash'} disabled={busy} label="Contado" onPress={() => props.onChange('paymentMode', 'cash')} />
            <Option checked={props.paymentMode === 'credit'} disabled={busy} label="Crédito" onPress={() => props.onChange('paymentMode', 'credit')} />
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
        </View>
        <View style={s.net}>
          <View>
            <Text style={s.netTitle}>TOTAL NETO A COBRAR</Text>
            <Text style={s.netHelp}>{props.paymentMode === 'cash' ? 'Saldo a cobrar al despacho' : 'Saldo a crédito, en cuotas'}</Text>
          </View>
          <Text accessibilityLabel={`Total neto a cobrar: ${money('totalCents')}`} style={s.netValue}>{money('totalCents')}</Text>
        </View>
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
    </AppScreen>
  );
}

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
