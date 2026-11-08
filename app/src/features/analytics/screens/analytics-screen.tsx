import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { analyticsExclusionReason, analyticsFilterLabel, analyticsPointKey, weeklyComparisons, type AnalyticsFilterOption, type AnalyticsSeries, type PredictionReadiness } from '@/domain/analytics/analytics';
import { formatLimaDateInput, formatLimaDateTime, isValidCivilDate } from '@/domain/shared/date';
import { validateAnalyticsPeriod } from '@/domain/analytics/period';
import { useSession } from '@/features/auth/session/session-provider';
import { analyticsSeries, loadAnalyticsFilters, predictionReadiness } from '@/services/api/analytics-api';
import { ApiError } from '@/services/api/api-client';
import { AppButton, AppCard, AppScreen, ChoiceDialog, EmptyState, FeedbackState, FormField, LoadingState, ScreenHeader, SelectionField } from '@/ui/components';
import { color, spacing, typography } from '@/ui/tokens';
import { EvaluationPanel } from './evaluation-panel';
import { EvaluationHistory } from './evaluation-history';
import { PublicationHistory } from './publication-history';
import {PointSources} from './point-sources';

function filterName(options: AnalyticsFilterOption[], id: string) {
  if (id === 'unreported') return 'No informada';
  const selected = options.find(item => item.id === id);
  return selected ? analyticsFilterLabel(selected) : undefined;
}

export function AnalyticsScreen() {
  const { session } = useSession();
  return session ? <AnalyticsContent key={session.accessToken} /> : null;
}

function AnalyticsContent() {
  const { session, invalidateSession } = useSession();
  const token = session?.accessToken ?? '';
  const [period, setPeriod] = useState(() => { const to = formatLimaDateInput(); return { from: `${to.slice(0, 8)}01`, to }; });
  const [varietyId, setVarietyId] = useState('');
  const [varieties, setVarieties] = useState<AnalyticsFilterOption[]>([]);
  const [providers, setProviders] = useState<AnalyticsFilterOption[]>([]);
  const [buyers, setBuyers] = useState<AnalyticsFilterOption[]>([]);
  const [qualities, setQualities] = useState<AnalyticsFilterOption[]>([]);
  const [origins, setOrigins] = useState<AnalyticsFilterOption[]>([]);
  const [qualityId, setQualityId] = useState('');
  const [originId, setOriginId] = useState('');
  const [providerId, setProviderId] = useState('');
  const [buyerId, setBuyerId] = useState('');
  const [dialog, setDialog] = useState<'variety' | 'provider' | 'buyer' | 'quality' | 'origin' | null>(null); const [busy, setBusy] = useState(false);
  const [data, setData] = useState<AnalyticsSeries | null>(null); const [error, setError] = useState<string | null>(null);
  const [catalogError, setCatalogError] = useState(false); const [catalogAttempt, setCatalogAttempt] = useState(0);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const request = useRef(0);
  const readinessRequest = useRef(0);
  const [readiness, setReadiness] = useState<PredictionReadiness | null>(null);
  const [checking, setChecking] = useState(false);
  const [readinessError, setReadinessError] = useState<string | null>(null);
  const [showWeeks, setShowWeeks] = useState(false);
  const [historyRefresh,setHistoryRefresh]=useState(0);
  const [publicationRefresh,setPublicationRefresh]=useState(0);
  useEffect(() => {
    let active = true;
    loadAnalyticsFilters(token).then(catalogs => { if (active) { setVarieties(catalogs.varieties); setProviders(catalogs.providers); setBuyers(catalogs.buyers); setQualities(catalogs.qualities); setOrigins(catalogs.origins); setCatalogError(false); } }).catch(cause => {
      if (!active) return;
      if (cause instanceof ApiError && cause.status === 401) void invalidateSession(); else setCatalogError(true);
    }).finally(() => { if (active) setCatalogLoading(false); });
    return () => { active = false; };
  }, [token, invalidateSession, catalogAttempt]);
  useEffect(() => () => { request.current += 1; readinessRequest.current += 1; }, []);
  function clearResult() { request.current += 1; setData(null); setError(null); setBusy(false); readinessRequest.current += 1; setReadiness(null); setReadinessError(null); setChecking(false); setShowWeeks(false); }
  async function checkHistory() {
    if (!varietyId) return;
    if (!isValidCivilDate(period.to)) { setReadinessError('Escribe una fecha de corte válida con el formato AAAA-MM-DD.'); return; }
    const id = ++readinessRequest.current; setChecking(true); setReadinessError(null); setReadiness(null); setShowWeeks(false);
    try {
      const result = await predictionReadiness(token, period.to, varietyId);
      if (id === readinessRequest.current) setReadiness(result);
    } catch (cause) {
      if (id !== readinessRequest.current) return;
      if (cause instanceof ApiError && cause.status === 401) void invalidateSession();
      else setReadinessError(cause instanceof ApiError ? cause.message : 'No se pudo revisar el historial. Revisa tu conexión y reintenta.');
    } finally { if (id === readinessRequest.current) setChecking(false); }
  }
  async function run() {
    const validation = validateAnalyticsPeriod(period.from, period.to);
    if (validation) { setError(validation); return; }
    const id = ++request.current; setBusy(true); setError(null); setData(null);
    try {
      const result = await analyticsSeries(token, { ...period, varietyId: varietyId || undefined, providerId: providerId || undefined, buyerId: buyerId || undefined, qualityId: qualityId || undefined, originId: originId || undefined });
      if (id === request.current) setData(result);
    } catch (cause) {
      if (id !== request.current) return;
      if (cause instanceof ApiError && cause.status === 401) void invalidateSession();
      else setError(cause instanceof ApiError ? cause.message : 'No se pudo consultar el análisis. Revisa tu conexión y reintenta.');
    } finally { if (id === request.current) setBusy(false); }
  }
  if (!session) return null;
  const comparisons = weeklyComparisons(data?.points ?? []);
  const dialogs = {
    variety: { title: 'Seleccionar variedad', all: 'Todas las variedades', options: varieties, selected: varietyId, select: setVarietyId },
    provider: { title: 'Seleccionar proveedor de compras', all: 'Todos los proveedores', options: providers, selected: providerId, select: setProviderId },
    buyer: { title: 'Seleccionar comprador de ventas', all: 'Todos los compradores', options: buyers, selected: buyerId, select: setBuyerId },
    quality: { title: 'Filtrar por calidad comercial', all: 'Todas las calidades', options: qualities, selected: qualityId, select: setQualityId },
    origin: { title: 'Filtrar por procedencia de la papa', all: 'Todas las procedencias', options: origins, selected: originId, select: setOriginId },
  };
  const selectedDialog = dialogs[dialog ?? 'variety'];
  return <><AppScreen contentContainerStyle={styles.screen}>
    <ScreenHeader eyebrow="ANALÍTICA" title="Tendencias comerciales" description="Precios pactados y cantidades de operaciones confirmadas, separados por semana y variedad." />
    <AppCard title="Periodo, variedad y participantes">
      <View style={styles.fields}>
        <View style={styles.field}><FormField editable={!busy} label="Desde" value={period.from} onChangeText={from => { clearResult(); setPeriod(current => ({ ...current, from })); }} /></View>
        <View style={styles.field}><FormField editable={!busy} label="Hasta" value={period.to} onChangeText={to => { clearResult(); setPeriod(current => ({ ...current, to })); }} /></View>
      </View>
      <SelectionField disabled={busy || catalogError || catalogLoading} label="Variedad" placeholder="Todas las variedades" value={filterName(varieties, varietyId)} onPress={() => setDialog('variety')} />
      <SelectionField disabled={busy || catalogError || catalogLoading} label="Proveedor de compras" placeholder="Todos los proveedores" value={filterName(providers, providerId)} onPress={() => setDialog('provider')} />
      <SelectionField disabled={busy || catalogError || catalogLoading} label="Comprador de ventas" placeholder="Todos los compradores" value={filterName(buyers, buyerId)} onPress={() => setDialog('buyer')} />
      <SelectionField disabled={busy || catalogError || catalogLoading} label="Calidad comercial" placeholder="Todas las calidades" value={filterName(qualities, qualityId)} onPress={() => setDialog('quality')} />
      <SelectionField disabled={busy || catalogError || catalogLoading} label="Procedencia de la papa" placeholder="Todas las procedencias" value={filterName(origins, originId)} onPress={() => setDialog('origin')} />
      {catalogLoading ? <LoadingState label="Cargando filtros históricos" /> : null}
      <Text style={styles.meta}>El proveedor filtra compras y el comprador filtra ventas. Incluye registros desactivados para consultar su historial. Estas selecciones no cambian el historial requerido para estimar.</Text>
      <Text style={styles.meta}>Calidad y procedencia filtran compras y ventas. «No informada» consulta únicamente operaciones sin ese dato. Los nombres de las listas son los actuales; cada opción reúne su historial aunque haya cambiado de nombre. Los comprobantes conservan las etiquetas originales. Estos filtros no cambian las estimaciones por variedad.</Text>
      {catalogError ? <FeedbackState title="Filtros no disponibles" message="Puedes consultar sin cambiar participantes o reintentar la carga de los catálogos." actionLabel="Reintentar filtros" onAction={() => { setCatalogLoading(true); setCatalogAttempt(current => current + 1); }} tone="warning" /> : null}
      {error ? <FeedbackState title="No se pudo consultar" message={error} tone="error" actionLabel="Reintentar análisis" onAction={() => void run()} /> : null}
      {busy ? <LoadingState label="Consultando operaciones confirmadas" /> : null}
      <AppButton disabled={busy} label={busy ? 'Consultando…' : 'Consultar análisis'} onPress={() => void run()} />
    </AppCard>
    <AppCard title="Disponibilidad de estimaciones" description={`Corte ${period.to}. Se revisan 26 semanas completas, independientemente de la fecha Desde.`}>
      {!varietyId ? <Text style={styles.text}>Selecciona una variedad específica para revisar las condiciones de estimación.</Text> : null}
      <AppButton disabled={!varietyId || checking || busy} label={checking ? 'Revisando historial…' : 'Revisar disponibilidad predictiva'} onPress={() => void checkHistory()} tone="secondary" />
      {checking ? <LoadingState label="Revisando las 26 semanas anteriores" /> : null}
      {readinessError ? <FeedbackState title="No se pudo revisar el historial" message={readinessError} tone="error" actionLabel="Reintentar disponibilidad" onAction={() => void checkHistory()} /> : null}
      {readiness ? <>
        <FeedbackState title={readiness.dataSufficient ? 'Historial apto para evaluación' : 'Historial insuficiente para estimar'} message="Publicar requiere una evaluación que cumpla los criterios y la revisión del Mayorista. Las versiones conservadas se consultan por separado." tone={readiness.dataSufficient ? 'neutral' : 'warning'} />
        <FeedbackState title={readiness.availability.state==='current'?'Publicación vigente':readiness.availability.state==='requires_reevaluation'?'Publicación requiere reevaluación':readiness.availability.state==='not_published'?'Sin publicación conservada':'Corte histórico'} message={readiness.availability.message} tone={readiness.availability.state==='requires_reevaluation'?'warning':'neutral'}/>
        {readiness.availability.publicationId?<Text style={styles.meta}>Publicación {readiness.availability.publicationId} · Verificada al {new Date(readiness.availability.checkedAt).toLocaleString('es-PE',{timeZone:readiness.timeZone})}. Puedes recuperar su versión original en Publicaciones conservadas.</Text>:null}
        <Text style={styles.text}>{readiness.varietyName} · {readiness.window.from} – {readiness.window.to} · {readiness.timeZone}</Text>
        <Text style={styles.text}>{readiness.sufficientWeeks} de {readiness.window.weeksRequired} semanas cumplen el mínimo de {readiness.window.minimumSalesPerWeek} ventas válidas.</Text>
        {readiness.criteria.map(criterion => <View key={criterion.id}><Text style={styles.text}>{criterion.status === 'met' ? 'Cumplido' : criterion.status === 'unmet' ? 'Falta' : 'Pendiente'} · {criterion.message}</Text></View>)}
        <AppButton label={showWeeks ? 'Ocultar semanas revisadas' : 'Ver semanas revisadas'} onPress={() => setShowWeeks(current => !current)} tone="secondary" />
        {showWeeks ? readiness.weeks.map(week => <View key={week.weekStart}><Text style={styles.text}>{week.weekStart} – {week.weekEnd} · {week.validSaleCount} ventas válidas · {week.sufficient ? 'Cumple' : 'Insuficiente'}</Text><Text style={styles.meta}>{week.weightKg === null ? 'Sin peso comercial válido; no se calculó precio.' : `${week.weightKg} kg de mercadería`}</Text></View>) : null}
        {readiness.excluded.length ? <Text style={styles.meta}>{readiness.excluded.length} registros excluidos del historial; no se imputaron fechas, pesos ni precios.</Text> : null}
        {readiness.excluded.map((item, index) => <AppCard key={`${item.operationId}:${item.varietyId}:${index}`} title={`Venta excluida · ${item.varietyName}`} description={`Semana ${item.weekStart}`}><Text style={styles.text}>{analyticsExclusionReason(item.reason)}</Text><Text style={styles.meta}>Referencia de operación: {item.operationId}</Text></AppCard>)}
      </> : null}
    </AppCard>
    {readiness?.dataSufficient && varietyId ? <EvaluationPanel key={`${token}:${varietyId}:${period.to}`} token={token} varietyId={varietyId} asOf={period.to} onSaved={()=>setHistoryRefresh(current=>current+1)} onPublished={()=>setPublicationRefresh(current=>current+1)}/> : null}
    {varietyId ? <PublicationHistory key={`publications:${token}:${varietyId}:${publicationRefresh}`} token={token} varietyId={varietyId}/> : null}
    {varietyId ? <EvaluationHistory key={`evaluations:${token}:${varietyId}:${historyRefresh}`} token={token} varietyId={varietyId} onPublished={()=>setPublicationRefresh(current=>current+1)}/> : null}
    {!data && !busy && !error ? <EmptyState title="Selecciona un periodo" message="Consulta hasta 366 días para comparar precios y cantidades registrados." /> : null}
    {data ? <>
      <Text style={styles.meta}>Periodo {data.filters.from} – {data.filters.to} · {data.timeZone}{'\n'}Actualizado {formatLimaDateTime(data.generatedAt)}</Text>
      <Text style={styles.meta}>Compras: {data.filters.providerId ? filterName(providers, data.filters.providerId) ?? data.filters.providerId : 'Todos los proveedores'} · Ventas: {data.filters.buyerId ? filterName(buyers, data.filters.buyerId) ?? data.filters.buyerId : 'Todos los compradores'}</Text>
      <Text style={styles.meta}>Calidad: {data.filters.qualityId ? filterName(qualities, data.filters.qualityId) ?? data.filters.qualityId : 'Todas las calidades'} · Procedencia: {data.filters.originId ? filterName(origins, data.filters.originId) ?? data.filters.originId : 'Todas las procedencias'}</Text>
      <Text style={styles.text}>El precio por kg pondera el peso real. Corresponde a mercadería antes de descuentos, adelantos y flete. Las devoluciones comerciales reducen cantidades e importes al cierre consultado.</Text>
      {!data.points.length ? <EmptyState title="Sin operaciones analizables" message="No hay cantidades comerciales válidas en este periodo y variedad. Prueba otro periodo." /> : null}
      {data.points.slice().reverse().map(point => <AppCard key={`${point.operationType}:${point.varietyId}:${point.weekStart}`} title={`${point.operationType === 'purchase' ? 'Compras' : 'Ventas'} · ${point.varietyName}`} description={`${point.weekStart} – ${point.weekEnd} · ${point.complete ? 'Semana completa' : 'Semana parcial'}`}>
        <Text style={styles.price}>S/ {point.priceSolesPerKg} por kg</Text>
        <Text style={styles.text}>{point.operationCount} {point.operationCount === 1 ? 'operación' : 'operaciones'} · {point.sacks} {point.sacks === 1 ? 'saco' : 'sacos'} · {point.weightKg} kg</Text>
        <Text style={styles.meta}>{comparisons.get(analyticsPointKey(point))}</Text>
        {point.compensationIds.length ? <Text style={styles.meta}>{point.compensationIds.length} devoluciones comerciales incorporadas</Text> : null}
        <PointSources point={point}/>
      </AppCard>)}
      {data.excluded.length ? <FeedbackState title="Operaciones excluidas" message={`${data.excluded.length} registros no aportan cantidades válidas o quedaron totalmente compensados. No se rellenaron precios ni pesos.`} tone="warning" /> : null}
      {data.excluded.map((item, index) => <AppCard key={`${item.operationId}:${item.varietyId}:${index}`} title={`${item.operationType === 'purchase' ? 'Compra' : 'Venta'} excluida · ${item.varietyName}`} description={`Semana ${item.weekStart}`}><Text style={styles.text}>{analyticsExclusionReason(item.reason)}</Text><Text style={styles.meta}>Referencia de operación: {item.operationId}</Text></AppCard>)}
    </> : null}
  </AppScreen><ChoiceDialog visible={dialog !== null && !busy} title={selectedDialog.title} choices={[{ id: '', label: selectedDialog.all }, ...(dialog === 'quality' || dialog === 'origin' ? [{ id: 'unreported', label: 'No informada' }] : []), ...selectedDialog.options.map(item => ({ id: item.id, label: analyticsFilterLabel(item) }))]} selectedIds={[selectedDialog.selected]} onClose={() => setDialog(null)} onSelect={choice => { if (!dialog) return; clearResult(); selectedDialog.select(choice.id); setDialog(null); }} /></>;
}
const styles = StyleSheet.create({ screen: { gap: spacing.lg }, fields: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }, field: { flexGrow: 1, flexBasis: 220 }, text: { color: color.textPrimary, ...typography.body }, meta: { color: color.textSecondary, ...typography.bodySmall }, price: { color: color.textPrimary, ...typography.body, fontWeight: '700' } });
