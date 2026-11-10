import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { formatMoney } from "@/domain/reception/reception";
import { formatLocalDateInput, isValidCivilDate } from "@/domain/shared/date";
import { useSession } from "@/features/auth/session/session-provider";
import { loadHistoricalCommercialFilters as loadCatalogs } from "@/services/api/analytics-api";
import { analyticsFilterLabel } from '@/domain/analytics/analytics';
import { commercialDescription } from '@/domain/catalog/commercial-characteristic';
import { accountDueLabel } from '@/domain/accounts/account-dates';
import { reportPeriod, reportPeriodChoices, type ReportPeriodPreset } from '@/domain/shared/report-period';
import {
  commercialSummary,
  operationOverview,
  priceHistory,
  reportAlerts,
  type CommercialSummary,
  type OperationOverview,
  type PriceHistory,
  type ReportAlerts,
} from "@/services/api/operations-api";
import {
  AppButton,
  AppCard,
  AppScreen,
  ChoiceDialog,
  EmptyState,
  FeedbackState,
  FormField,
  MetricTile,
  SelectionField,
} from "@/ui/components";
import { AppHeader } from "@/ui/navigation/app-header";
import { color, spacing, typography } from "@/ui/tokens";
import { ReportDownloads } from './report-downloads';
import { ReportIndicators } from './report-indicators';
import { ReportCharts } from './report-charts';

type Dialog = "buyer" | "operation" | "provider" | "variety" | "quality" | "origin" | "period" | null;
type OperationFilter = "all" | "purchase" | "sale";

// autoQuery (spec 011, RQ-ST07): Reportes opens with the figures of the period;
// false keeps the screen empty until «Consultar» (used to test the manual query).
// initialOperation (RQ-ST11): the side of the menu it was opened from.
export function ReportsScreen({ autoQuery = true, initialOperation = 'purchase' }: { autoQuery?: boolean; initialOperation?: 'purchase' | 'sale' }) {
  const { session } = useSession();
  return session ? <ReportsWorkspace key={session.accessToken} autoQuery={autoQuery} initialOperation={initialOperation} /> : null;
}

function ReportsWorkspace({ autoQuery, initialOperation }: { autoQuery: boolean; initialOperation: 'purchase' | 'sale' }) {
  const { session, invalidateSession } = useSession();
  const token = session?.accessToken ?? '';
  const [initialPeriod] = useState(() => {
    const today = formatLocalDateInput();
    return { from: `${today.slice(0, 8)}01`, to: today };
  });
  const [from, setFrom] = useState(initialPeriod.from);
  const [to, setTo] = useState(initialPeriod.to);
  const [periodPreset, setPeriodPreset] = useState<ReportPeriodPreset>('current-month');
  const [data, setData] = useState<CommercialSummary | null>(null);
  const [reportOperation, setReportOperation] = useState<'purchase' | 'sale'>(initialOperation);
  // Spec 011 (CL-ST18): a period chip queries at once; «Exportar» shows the downloads.
  const [queryRevision, setQueryRevision] = useState(0);
  const [exportVisible, setExportVisible] = useState(false);
  const [overview, setOverview] = useState<OperationOverview | null>(null);
  const [alerts, setAlerts] = useState<ReportAlerts | null>(null);
  const [prices, setPrices] = useState<PriceHistory | null>(null);
  const [catalogs, setCatalogs] = useState<
    Awaited<ReturnType<typeof loadCatalogs>>
  >({ buyers: [], providers: [], varieties: [], qualities: [], origins: [] });
  const [catalogsLoading, setCatalogsLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const [buyerId, setBuyerId] = useState("");
  const [providerId, setProviderId] = useState("");
  const [varietyId, setVarietyId] = useState("");
  const [qualityId, setQualityId] = useState('');
  const [originId, setOriginId] = useState('');
  const [operation, setOperation] = useState<OperationFilter>("all");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const requestSequence = useRef(0);

  function invalidateResults() {
    requestSequence.current += 1;
    setData(null);
    setOverview(null);
    setAlerts(null);
    setPrices(null);
    setError(null);
    setBusy(false);
  }

  useEffect(
    () => () => {
      requestSequence.current += 1;
    },
    [],
  );

  useEffect(() => {
    if (!token) return;
    let active = true;
    loadCatalogs(token)
      .then((value) => {
        if (active) setCatalogs(value);
      })
      .catch((requestError) => {
        if (active)
          setCatalogError(
            requestError instanceof Error
              ? requestError.message
              : "No se pudieron cargar los filtros.",
          );
      })
      .finally(() => {
        if (active) setCatalogsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, catalogAttempt]);

  async function run() {
    if (!session) return;
    if (
      !isValidCivilDate(from) ||
      !isValidCivilDate(to) ||
      from > to
    ) {
      setError(
        "Ingresa un periodo válido; la fecha inicial no puede ser posterior a la final.",
      );
      return;
    }
    setBusy(true);
    setError(null);
    const sequence = ++requestSequence.current;
    setData(null);
    setOverview(null);
    setAlerts(null);
    setPrices(null);
    try {
      const [summaryResult, alertResult, priceResult, overviewResult] = await Promise.all([
        commercialSummary(session.accessToken, from, to),
        reportAlerts(session.accessToken, to, to),
        priceHistory(session.accessToken, from, to, {
          buyerId: buyerId || undefined,
          providerId: providerId || undefined,
          varietyId: varietyId || undefined,
          qualityId: qualityId || undefined,
          originId: originId || undefined,
        }),
        operationOverview(session.accessToken, reportOperation, from, to),
      ]);
      if (sequence !== requestSequence.current) return;
      setData(summaryResult);
      setOverview(overviewResult);
      setAlerts(alertResult);
      setPrices(priceResult);
    } catch (requestError) {
      if (sequence !== requestSequence.current) return;
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo generar el reporte.",
      );
    } finally {
      if (sequence === requestSequence.current) setBusy(false);
    }
  }

  // Spec 011 (RQ-ST07): Reportes opens with the figures of the current period,
  // and again when switching between Compra and Venta.
  const autoRun = useRef(run);
  useEffect(() => {
    autoRun.current = run;
  });
  useEffect(() => {
    if (!token || !autoQuery) return;
    void Promise.resolve().then(() => autoRun.current());
  }, [autoQuery, reportOperation, token, queryRevision]);

  if (!session) return null;

  const visiblePrices =
    prices?.items.filter(
      (item) => operation === "all" || item.operationType === operation,
    ) ?? [];
  const variety = catalogs.varieties.find((item) => item.id === varietyId);
  const provider = catalogs.providers.find((item) => item.id === providerId);
  const buyer = catalogs.buyers.find((item) => item.id === buyerId);
  const quality = catalogs.qualities.find(item => item.id === qualityId);
  const origin = catalogs.origins.find(item => item.id === originId);
  const choices =
    dialog === 'period' ? [...reportPeriodChoices] : dialog === 'quality' || dialog === 'origin'
      ? [{id:'',label:dialog==='quality'?'Todas las calidades':'Todas las procedencias'}, {id:'unreported',label:'No informada'}, ...(dialog==='quality'?catalogs.qualities:catalogs.origins).map(item=>({id:item.id,label:analyticsFilterLabel(item)}))]
      : dialog === "variety"
      ? [
          { id: "", label: "Todas las variedades" },
          ...catalogs.varieties.map((item) => ({
            id: item.id,
            label: analyticsFilterLabel(item),
          })),
        ]
      : dialog === "provider"
        ? [
            { id: "", label: "Todos los proveedores" },
            ...catalogs.providers.map((item) => ({
              id: item.id,
              label: analyticsFilterLabel(item),
            })),
          ]
        : dialog === "buyer"
          ? [
              { id: "", label: "Todos los compradores" },
              ...catalogs.buyers.map((item) => ({
                id: item.id,
                label: analyticsFilterLabel(item),
              })),
            ]
          : [
              { id: "all", label: "Compras y ventas" },
              { id: "purchase", label: "Solo compras" },
              { id: "sale", label: "Solo ventas" },
            ];

  return (
    <AppScreen contentContainerStyle={styles.screen}>
      <AppHeader eyebrow={reportOperation === 'purchase' ? 'COMPRA' : 'VENTA'} subtitle="Consolidado del período y exportación" title="Reportes" />
      {/* Spec 011 (CL-ST18): the hero of the Stitch reports: operation, title,
          period chips and export. */}
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.heroTitles}>
            <View accessibilityRole="tablist" style={styles.operationTabs}>
              {(['purchase', 'sale'] as const).map(kind => (
                <AppButton key={kind} label={kind === 'purchase' ? 'Compra' : 'Venta'} displayLabel={kind === 'purchase' ? 'Compras' : 'Ventas'}
                  appearance="stitch-chip"
                  accessibilityRole="tab" accessibilityState={{ selected: reportOperation === kind }}
                  tone={reportOperation === kind ? 'primary' : 'secondary'}
                  onPress={() => { if (kind !== reportOperation) { invalidateResults(); setReportOperation(kind); } }} />
              ))}
            </View>
            <View style={styles.heroTitleLine}>
              <View style={styles.heroBar} />
              <Text accessibilityRole="header" style={styles.heroTitle}>{reportOperation === 'purchase' ? 'Reportes de compras' : 'Reportes de ventas'}</Text>
              <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>{`RPT-${from.slice(0, 4)}-${reportOperation === 'purchase' ? 'C' : 'V'}`}</Text></View>
            </View>
            <Text style={styles.heroSubtitle}>{reportOperation === 'purchase' ? 'CONSOLIDADO DE ACOPIO, PROVEEDORES, LIQUIDACIONES Y KILAJES' : 'CONSOLIDADO DE VENTAS, COMPRADORES, DESPACHOS Y COBRANZAS'}</Text>
          </View>
          <View style={styles.heroSide}>
            <View accessibilityRole="radiogroup" style={styles.presets}>
              {(['today', 'this-week', 'current-month', 'custom'] as const).map(preset => (
                <AppButton key={preset} appearance="stitch-chip" disabled={busy}
                  label={preset === 'today' ? 'Hoy' : preset === 'this-week' ? 'Esta semana' : preset === 'current-month' ? 'Este mes' : 'Personalizado'}
                  accessibilityRole="radio" accessibilityState={{ checked: periodPreset === preset }}
                  tone={periodPreset === preset ? 'primary' : 'secondary'}
                  onPress={() => {
                    if (preset === 'custom') { setPeriodPreset('custom'); return; }
                    invalidateResults();
                    const period = reportPeriod(preset);
                    setFrom(period.from); setTo(period.to); setPeriodPreset(preset);
                    setQueryRevision(value => value + 1);
                  }} />
              ))}
            </View>
            <AppButton appearance="stitch-action" stitchTone="success" disabled={!overview}
              label="Exportar PDF o Excel" displayLabel="+ EXPORTAR PDF / EXCEL"
              onPress={() => setExportVisible(value => !value)} />
          </View>
        </View>
        <View style={styles.periodFields}>
          <View style={styles.periodField}>
            <SelectionField appearance="stitch" label="Período" placeholder="Seleccionar período" value={reportPeriodChoices.find(item => item.id === periodPreset)?.label} onPress={() => setDialog('period')} />
          </View>
          <View style={styles.periodField}>
            <FormField label="Desde" appearance="stitch" onChangeText={(value) => { invalidateResults(); setFrom(value); setPeriodPreset('custom'); }} value={from} />
          </View>
          <View style={styles.periodField}>
            <FormField label="Hasta" appearance="stitch" onChangeText={(value) => { invalidateResults(); setTo(value); setPeriodPreset('custom'); }} value={to} />
          </View>
          <View style={styles.periodActions}>
            <AppButton label="Restablecer período" displayLabel="Restablecer" appearance="stitch-action" tone="secondary" onPress={() => {
              invalidateResults();
              const period = reportPeriod('current-month');
              setFrom(period.from); setTo(period.to); setPeriodPreset('current-month');
            }} />
            <AppButton disabled={busy} appearance="stitch-action" stitchTone="brand"
              displayLabel={busy ? 'Consultando…' : 'Consultar'} accessibilityLabel={busy ? 'Consultando…' : 'Consultar'}
              label={busy ? "Generando…" : "Generar"} onPress={() => void run()} />
          </View>
        </View>
      </View>
      <View style={styles.body}>
      {overview ? <ReportIndicators overview={overview} /> : null}
      {overview ? <ReportCharts key={`charts:${token}:${overview.operation}:${overview.period.from}:${overview.period.to}:${overview.generatedAt}`} token={token} selection={{ operation: overview.operation, ...overview.period }} /> : null}
      {overview && exportVisible ? <ReportDownloads key={`${token}:${overview.operation}:${overview.period.from}:${overview.period.to}:${overview.generatedAt}`}
        token={token} counts={overview} onSessionExpired={invalidateSession} selection={{ operation: overview.operation, ...overview.period }} /> : null}
      <AppCard
        title="Filtros de precios"
        description="Los indicadores generales usan el periodo; estos filtros se aplican al historial de precios."
      >
        <View style={styles.filters}>
          <View style={styles.field}>
            <SelectionField
              label="Operación"
              onPress={() => setDialog("operation")}
              placeholder="Compras y ventas"
              value={
                operation === "all"
                  ? "Compras y ventas"
                  : operation === "purchase"
                    ? "Solo compras"
                    : "Solo ventas"
              }
            />
          </View>
          <View style={styles.field}>
            <SelectionField
              disabled={catalogsLoading || Boolean(catalogError)}
              label="Variedad"
              onPress={() => setDialog("variety")}
              placeholder="Todas las variedades"
              value={variety?analyticsFilterLabel(variety):undefined}
            />
          </View>
          <View style={styles.field}>
            <SelectionField
              disabled={
                catalogsLoading || Boolean(catalogError) || operation === "sale"
              }
              label="Proveedor"
              onPress={() => setDialog("provider")}
              placeholder="Todos los proveedores"
              supportingText={
                operation === "sale"
                  ? "Disponible al incluir compras."
                  : undefined
              }
              value={provider?analyticsFilterLabel(provider):undefined}
            />
          </View>
          <View style={styles.field}>
            <SelectionField
              disabled={
                catalogsLoading ||
                Boolean(catalogError) ||
                operation === "purchase"
              }
              label="Comprador"
              onPress={() => setDialog("buyer")}
              placeholder="Todos los compradores"
              supportingText={
                operation === "purchase"
                  ? "Disponible al incluir ventas."
                  : undefined
              }
              value={buyer?analyticsFilterLabel(buyer):undefined}
            />
          </View>
          <View style={styles.field}><SelectionField disabled={catalogsLoading || Boolean(catalogError)} label="Calidad comercial" placeholder="Todas las calidades" value={qualityId==='unreported'?'No informada':quality?analyticsFilterLabel(quality):undefined} onPress={()=>setDialog('quality')}/></View>
          <View style={styles.field}><SelectionField disabled={catalogsLoading || Boolean(catalogError)} label="Procedencia de la papa" placeholder="Todas las procedencias" value={originId==='unreported'?'No informada':origin?analyticsFilterLabel(origin):undefined} onPress={()=>setDialog('origin')}/></View>
        </View>
        <Text style={styles.priceMeta}>Las listas incluyen opciones históricas desactivadas y muestran su nombre actual. «No informada» filtra solo ausencia del dato. Cada precio conserva las etiquetas originales de su operación; estos filtros no cambian los indicadores generales.</Text>
        <AppButton
          label="Limpiar filtros"
          onPress={() => {
            invalidateResults();
            setOperation("all");
            setVarietyId("");
            setProviderId("");
            setBuyerId("");
            setQualityId('');
            setOriginId('');
          }}
          tone="secondary"
        />
        {catalogsLoading ? (
          <Text style={styles.priceMeta}>
            Cargando filtros históricos…
          </Text>
        ) : null}
        {catalogError ? (
          <FeedbackState
            title="Filtros no disponibles"
            message={catalogError}
            tone="warning"
            actionLabel="Reintentar filtros"
            onAction={() => {
              setDialog(null);
              setCatalogsLoading(true);
              setCatalogError(null);
              setCatalogAttempt((current) => current + 1);
            }}
          />
        ) : null}
      </AppCard>
      {error ? (
        <FeedbackState
          title="No se pudo generar"
          message={error}
          tone="error"
        />
      ) : null}
      {data ? (
        <>
          <Text style={styles.priceMeta}>
            Periodo: {from} a {to}. Resumen actualizado: {Number.isFinite(Date.parse(data.generatedAt))
              ? new Date(data.generatedAt).toLocaleString('es-PE', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) + ' (Lima)'
              : 'fecha no disponible'}.
          </Text>
          <View style={styles.metrics}>
            <MetricTile
              label="Compras"
              value={formatMoney(data.purchases.liquidAmountCents)}
            />
            <MetricTile
              label="Ventas"
              value={formatMoney(data.sales.totalAmountCents)}
            />
            <MetricTile
              label="Caja neta"
              value={formatMoney(data.cash.netCents)}
            />
            <MetricTile
              label="Por pagar"
              value={formatMoney(data.accounts.payableBalanceCents)}
            />
            <MetricTile
              label="Por cobrar"
              value={formatMoney(data.accounts.receivableBalanceCents)}
            />
          </View>
          <AppCard title="Costos">
            <View style={styles.metrics}>
              <MetricTile
                label="Flete compras"
                value={formatMoney(data.costs.purchaseFreightCents)}
              />
              <MetricTile
                label="Flete ventas"
                value={formatMoney(data.costs.saleFreightCents)}
              />
              <MetricTile
                label="Estiba"
                value={formatMoney(data.costs.stowageCents)}
              />
            </View>
          </AppCard>
          {alerts ? (
            <AppCard
              title="Alertas"
              description={`${alerts.accountAlerts.length} cuotas pendientes hasta ${to}. Estados al corte de esa fecha.`}
            >
              <View style={styles.metrics}>
                <MetricTile
                  label="Cuotas"
                  value={String(alerts.accountAlerts.length)}
                />
              </View>
              {alerts.accountAlerts.length ? alerts.accountAlerts.map((alert, index) => (
                <View key={alert.installmentId ?? `${alert.accountId}:${alert.dueOn}:${index}`} style={styles.priceRow}>
                  <View style={styles.priceCopy}>
                    <Text style={styles.priceTitle}>{alert.kind === 'payable' ? 'Por pagar' : 'Por cobrar'} · {alert.status === 'overdue' ? 'Vencida al corte' : alert.dueOn === to ? 'Vence al corte' : 'Por vencer al corte'}</Text>
                    <Text style={styles.priceMeta}>Cuenta: {alert.accountId}</Text>
                    {alert.installmentId ? <Text style={styles.priceMeta}>Cuota: {alert.installmentId}</Text> : null}
                    <Text style={styles.priceMeta}>{accountDueLabel(alert.dueOn)}</Text>
                  </View>
                  <Text style={styles.priceValue}>Saldo de cuota: {formatMoney(alert.balanceCents)}</Text>
                </View>
              )) : <EmptyState title="Sin cuotas pendientes al corte" message="No hay vencimientos pendientes hasta la fecha consultada." />}
            </AppCard>
          ) : null}
          {prices ? (
            <AppCard
              title="Historial de precios"
              description={`${visiblePrices.length} precios según los filtros seleccionados`}
            >
              {visiblePrices.length ? (
                visiblePrices.map((item) => (
                  <View
                    key={JSON.stringify([item.operationType,item.operationId,item.varietyId,item.sourceLineId??null,item.qualityId??null,item.qualityName??null,item.originId??null,item.originName??null,item.priceBasis,item.unitPriceCents])}
                    style={styles.priceRow}
                  >
                    <View style={styles.priceCopy}>
                      <Text style={styles.priceTitle}>
                        {item.varietyName} ·{" "}
                        {item.operationType === "purchase" ? "Compra" : "Venta"}
                      </Text>
                      <Text style={styles.priceMeta}>
                        {item.counterpartyName} ·{" "}
                        {new Date(item.occurredAt).toLocaleDateString("es-PE", {timeZone:'America/Lima'})}
                      </Text>
                      <Text style={styles.priceMeta}>{commercialDescription(item)}</Text>
                    </View>
                    <Text style={styles.priceValue}>
                      {formatMoney(item.unitPriceCents)} /{" "}
                      {item.priceBasis === "sack" ? "saco" : "kg"}
                    </Text>
                  </View>
                ))
              ) : (
                <EmptyState
                  title="Sin precios"
                  message="No existen precios confirmados para el periodo y filtros seleccionados."
                />
              )}
            </AppCard>
          ) : null}
        </>
      ) : null}
      </View>
      <ChoiceDialog
        choices={choices}
        onClose={() => setDialog(null)}
        onSelect={(choice) => {
          invalidateResults();
          if (dialog === "operation") {
            const next = choice.id as OperationFilter;
            setOperation(next);
            if (next === "purchase") setBuyerId("");
            if (next === "sale") setProviderId("");
          }
          if (dialog === 'period') {
            const preset = reportPeriodChoices.find(item => item.id === choice.id)?.id;
            if (preset) {
              setPeriodPreset(preset);
              if (preset !== 'custom') { const period = reportPeriod(preset); setFrom(period.from); setTo(period.to); }
            }
          }
          if (dialog === "variety") setVarietyId(choice.id);
          if (dialog === "provider") setProviderId(choice.id);
          if (dialog === "buyer") setBuyerId(choice.id);
          if (dialog === 'quality') setQualityId(choice.id);
          if (dialog === 'origin') setOriginId(choice.id);
          setDialog(null);
        }}
        selectedIds={[
          dialog === 'period' ? periodPreset : dialog === 'quality' ? qualityId : dialog === 'origin' ? originId : dialog === "operation"
            ? operation
            : dialog === "variety"
              ? varietyId
              : dialog === "provider"
                ? providerId
                : buyerId,
        ]}
        title={
          dialog === 'period' ? 'Seleccionar período' : dialog === 'quality' ? 'Filtrar por calidad comercial' : dialog === 'origin' ? 'Filtrar por procedencia de la papa' : dialog === "operation"
            ? "Filtrar por operación"
            : dialog === "variety"
              ? "Filtrar por variedad"
              : dialog === "provider"
                ? "Filtrar por proveedor"
                : "Filtrar por comprador"
        }
        visible={dialog !== null}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: 16, maxWidth: 1280, paddingBottom: 28 },
  body: { gap: 16 },
  hero: { backgroundColor: color.surfaceRaised, borderColor: '#E2E8F0', borderRadius: 16, borderWidth: 1, boxShadow: '0px 1px 2px rgba(15,23,42,0.05)', gap: 16, padding: 20 },
  heroTop: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between' },
  heroTitles: { flexBasis: 380, flexGrow: 1, gap: 8 },
  heroTitleLine: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  heroBar: { backgroundColor: '#047857', borderRadius: 3, height: 28, width: 6 },
  heroTitle: { color: '#0F172A', fontSize: 26, fontWeight: '700', letterSpacing: -0.4 },
  heroBadge: { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0', borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2 },
  heroBadgeText: { color: '#334155', fontFamily: 'monospace', fontSize: 11, fontWeight: '700' },
  heroSubtitle: { color: '#475569', fontSize: 11, fontWeight: '600', letterSpacing: 0.8 },
  heroSide: { alignItems: 'flex-end', gap: 12 },
  presets: { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0', borderRadius: 12, borderWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4, padding: 4 },
  periodField: { flexBasis: 180, flexGrow: 1, minWidth: 0, maxWidth: '100%' },
  periodActions: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  periodFields: { alignItems: 'flex-end', borderTopColor: '#F1F5F9', borderTopWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingTop: 14 },
  operationTabs: { alignSelf: 'flex-start', backgroundColor: '#F1F5F9', borderColor: '#E2E8F0', borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 4, padding: 4 },
  top: { alignItems: "flex-start" },
  filters: {
    alignItems: "flex-end",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  field: { flexBasis: 220, flexGrow: 1 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  priceRow: {
    alignItems: "center",
    borderBottomColor: color.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "space-between",
    paddingVertical: spacing.md,
  },
  priceCopy: { flexBasis: 220, flexGrow: 1, gap: spacing.xs },
  priceTitle: {
    color: color.textPrimary,
    ...typography.body,
    fontWeight: "700",
  },
  priceMeta: { color: color.textSecondary, ...typography.bodySmall },
  priceValue: {
    color: color.textPrimary,
    ...typography.body,
    fontWeight: "700",
  },
});
