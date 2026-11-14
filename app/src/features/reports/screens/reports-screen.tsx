import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";

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
  ScreenHeader,
  SelectionField,
} from "@/ui/components";
import { AppHeader } from "@/ui/navigation/app-header";
import { color, spacing, typography } from "@/ui/tokens";
import { ReportDownloads } from './report-downloads';
import { ReportIndicators } from './report-indicators';
import { useReportFonts } from '@/ui/report-fonts';
import { reportVisual } from '@/ui/report-tokens';
import { ReportAsset } from '@/ui/components/report-asset';

type Dialog = "buyer" | "operation" | "provider" | "variety" | "quality" | "origin" | "period" | null;
type OperationFilter = "all" | "purchase" | "sale";

export function ReportsScreen() {
  const { session } = useSession();
  return session ? <ReportsWorkspace key={session.accessToken} /> : null;
}

function ReportsWorkspace() {
  const { width, fontScale } = useWindowDimensions();
  const wide = width >= 1100 && fontScale <= 1.3;
  const reportFontsLoaded = useReportFonts();
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
  const [reportOperation, setReportOperation] = useState<'purchase' | 'sale'>('purchase');
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
    <AppScreen edgeToEdge contentContainerStyle={styles.screen}>
      <View style={styles.headerWrap}>
        <AppHeader eyebrow={reportOperation === 'purchase' ? 'COMPRA · REPORTES' : 'VENTA · REPORTES'} title="Reportes" />
      </View>
      <View style={styles.operationTabs} accessibilityRole="tablist">
        {(['purchase', 'sale'] as const).map(kind => (
          <AppButton key={kind} label={kind === 'purchase' ? 'Compra' : 'Venta'}
            appearance="report-operation" reportFontsLoaded={reportFontsLoaded}
            accessibilityRole="tab" accessibilityState={{ selected: reportOperation === kind }}
            tone={reportOperation === kind ? 'primary' : 'secondary'}
            onPress={() => { if (kind !== reportOperation) { invalidateResults(); setReportOperation(kind); } }} />
        ))}
      </View>
      <View style={[styles.body, wide && styles.wideBody]}>
      <ScreenHeader
        appearance="report" reportFontsLoaded={reportFontsLoaded}
        title="REPORTES"
        description={`Consulta el resumen de tus ${reportOperation === 'purchase' ? 'compras' : 'ventas'} y descarga los reportes del período que necesites.`}
      />
      <View style={styles.periodPanel}>
        <View style={styles.periodFields}>
          <View style={[styles.periodField, wide && styles.presetField]}>
            <SelectionField appearance="report" reportFontsLoaded={reportFontsLoaded} label="Período" placeholder="Seleccionar período" value={reportPeriodChoices.find(item => item.id === periodPreset)?.label} onPress={() => setDialog('period')} />
          </View>
          <View style={[styles.periodField, wide && styles.dateField]}>
            <FormField
              label="Desde"
              appearance="report" reportFontsLoaded={reportFontsLoaded}
              onChangeText={(value) => {
                invalidateResults();
                setFrom(value);
                setPeriodPreset('custom');
              }}
              value={from}
            />
          </View>
          <View style={[styles.periodField, wide && styles.dateField]}>
            <FormField
              label="Hasta"
              appearance="report" reportFontsLoaded={reportFontsLoaded}
              onChangeText={(value) => {
                invalidateResults();
                setTo(value);
                setPeriodPreset('custom');
              }}
              value={to}
            />
          </View>
          <View style={styles.periodActions}>
          <AppButton label="Restablecer período" displayLabel="Restablecer" appearance="report-link" reportFontsLoaded={reportFontsLoaded} tone="secondary" onPress={() => {
            invalidateResults();
            const period = reportPeriod('current-month');
            setFrom(period.from); setTo(period.to); setPeriodPreset('current-month');
          }} />
          <AppButton
            disabled={busy}
            appearance="report-query" reportFontsLoaded={reportFontsLoaded}
            leadingVisual={<ReportAsset kind="search" />} displayLabel={busy ? 'Consultando…' : 'Consultar'}
            accessibilityLabel={busy ? 'Consultando…' : 'Consultar'}
            label={busy ? "Generando…" : "Generar"}
            onPress={() => void run()}
          />
          </View>
        </View>
      </View>
      {overview ? <ReportIndicators overview={overview} /> : null}
      {overview ? <ReportDownloads key={`${token}:${overview.operation}:${overview.period.from}:${overview.period.to}:${overview.generatedAt}`}
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
  screen: { gap:31, paddingTop:23,paddingBottom:28,paddingHorizontal:21,backgroundColor:reportVisual.surface },
  headerWrap: {},
  body: {gap:24},
  wideBody: {paddingHorizontal:99,paddingTop:3},
  periodField: {flexBasis:200,flexGrow:1,minWidth:0,maxWidth:'100%'},
  presetField: {flexBasis:238,flexGrow:0},
  dateField: {flexBasis:228,flexGrow:0},
  periodActions: {flexGrow:1,flexDirection:'row',flexWrap:'wrap',justifyContent:'flex-end',alignItems:'center',gap:16},
  periodPanel: {backgroundColor:reportVisual.control,borderRadius:20,padding:24},
  periodFields: {flexDirection:'row',flexWrap:'wrap',gap:20,alignItems:'flex-end'},
  operationTabs: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 70, rowGap: 16 },
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
