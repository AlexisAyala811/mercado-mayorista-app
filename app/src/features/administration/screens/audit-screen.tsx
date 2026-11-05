import { backOrHome } from '@/navigation/back-or-home';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSession } from '@/features/auth/session/session-provider';
import { auditEventsFilters, emptyAuditFilters, type AuditFilters } from '@/domain/audit/audit-filters';
import type { Page } from '@/domain/reception/reception';
import { listAuditEvents, type AuditEvent } from '@/services/api/administration-api';
import { AppButton, AppCard, AppScreen, EmptyState, FeedbackState, FormField, LoadingState, ScreenHeader } from '@/ui/components';
import { color, spacing, typography } from '@/ui/tokens';

type AuditRequest = { filters: AuditFilters; offset: number };

export function AuditScreen() {
  const { session } = useSession();
  return session?.user.role === 'wholesaler' ? <AuditWorkspace key={session.accessToken} token={session.accessToken} /> : null;
}

function AuditWorkspace({ token }: { token: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<AuditFilters>(emptyAuditFilters);
  const [applied, setApplied] = useState<AuditFilters>(emptyAuditFilters);
  const [page, setPage] = useState<Page<AuditEvent> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [failed, setFailed] = useState<AuditRequest | null>(null);
  const sequence = useRef(0);

  const load = useCallback(async (filters: AuditFilters, offset: number) => {
    const request = ++sequence.current;
    setPage(null); setLoading(true); setError(null); setFailed(null);
    let valid = false;
    try {
      const query = auditEventsFilters(filters);
      valid = true;
      const result = await listAuditEvents(token, query, offset);
      if (request !== sequence.current) return;
      setPage(result); setApplied(filters);
    } catch (cause) {
      if (request !== sequence.current) return;
      setError(cause instanceof Error ? cause.message : 'No se pudo consultar la auditoría.');
      if (valid) setFailed({ filters, offset });
    } finally {
      if (request === sequence.current) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const request = ++sequence.current;
    listAuditEvents(token, auditEventsFilters(emptyAuditFilters), 0).then(result => {
      if (request === sequence.current) setPage(result);
    }).catch(cause => {
      if (request !== sequence.current) return;
      setError(cause instanceof Error ? cause.message : 'No se pudo consultar la auditoría.');
      setFailed({ filters: emptyAuditFilters, offset: 0 });
    }).finally(() => {
      if (request === sequence.current) setLoading(false);
    });
    return () => { sequence.current += 1; };
  }, [token]);

  function edit(field: keyof AuditFilters, value: string) {
    sequence.current += 1;
    setDraft(current => ({ ...current, [field]: value }));
    setPage(null); setError(null); setFailed(null); setLoading(false);
  }

  return <AppScreen contentContainerStyle={styles.screen}>
    <View style={styles.top}><AppButton label="Volver" onPress={() => backOrHome(router)} tone="secondary" /></View>
    <ScreenHeader eyebrow="AUDITORÍA" title="Trazabilidad del negocio" description="Consulta quién realizó cada creación, cambio, pago, anulación o intento denegado. Fechas y horas de Lima." />
    <AppCard title="Filtros">
      <View style={styles.filters}>
        <View style={styles.field}><FormField label="Acción exacta" maxLength={100} onChangeText={value => edit('action', value)} placeholder="sale.created" value={draft.action} /></View>
        <View style={styles.field}><FormField label="Tipo de recurso" maxLength={80} onChangeText={value => edit('resourceType', value)} placeholder="sale" value={draft.resourceType} /></View>
        <View style={styles.field}><FormField label="Desde (AAAA-MM-DD)" onChangeText={value => edit('from', value)} value={draft.from} /></View>
        <View style={styles.field}><FormField label="Hasta (AAAA-MM-DD)" onChangeText={value => edit('to', value)} value={draft.to} /></View>
      </View>
      <View style={styles.actions}>
        <AppButton disabled={loading} label="Limpiar filtros" tone="secondary" onPress={() => { setDraft(emptyAuditFilters); void load(emptyAuditFilters, 0); }} />
        <AppButton disabled={loading} label="Consultar" onPress={() => void load(draft, 0)} />
      </View>
    </AppCard>
    {error ? <FeedbackState title="No se pudo consultar" message={error} tone="error" actionLabel={failed ? 'Reintentar consulta' : undefined} onAction={failed ? () => void load(failed.filters, failed.offset) : undefined} /> : null}
    {loading ? <LoadingState label="Consultando auditoría" /> : page ? <>
      <Text accessibilityLiveRegion="polite" style={styles.meta}>{page.items.length ? `${page.offset + 1}–${page.offset + page.items.length}` : '0 en esta página'} de {page.total} eventos · {applied.from.trim() || 'Sin inicio'} / {applied.to.trim() || 'Sin límite'} (Lima)</Text>
      {page.items.length ? page.items.map(event => <AppCard key={event.id} title={humanize(event.action)} description={`${new Date(event.occurredAt).toLocaleString('es-PE', { timeZone: 'America/Lima' })} · ${event.resourceType}`}>
        <Text style={styles.meta}>Responsable: {event.actorUserId ?? 'Sistema'}</Text>
        <Text style={styles.meta}>Recurso: {event.resourceId ?? 'Sin identificador'}</Text>
        {Object.keys(event.details).length ? <Text style={styles.details}>{JSON.stringify(event.details)}</Text> : null}
        <Text style={styles.retention}>Conservación hasta {new Date(event.retentionUntil).toLocaleDateString('es-PE', { timeZone: 'America/Lima' })}</Text>
      </AppCard>) : <EmptyState title="Sin eventos en esta página" message="No existen eventos para esta página y los filtros consultados." />}
      <View style={styles.actions}>
        <AppButton label="Página anterior de auditoría" tone="secondary" disabled={page.offset === 0} onPress={() => void load(applied, Math.max(0, page.offset - 20))} />
        <AppButton label="Página siguiente de auditoría" tone="secondary" disabled={page.offset + page.items.length >= page.total} onPress={() => void load(applied, page.offset + 20)} />
      </View>
    </> : !error ? <Text style={styles.meta}>Consulta los filtros para mostrar los eventos.</Text> : null}
  </AppScreen>;
}

function humanize(value: string) { return value.replaceAll('.', ' · ').replaceAll('-', ' '); }

const styles = StyleSheet.create({
  screen: { gap: spacing.xl }, top: { alignItems: 'flex-start' }, filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }, field: { flexBasis: 220, flexGrow: 1, minWidth: 0, maxWidth: '100%' }, actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: spacing.sm },
  meta: { color: color.textSecondary, ...typography.bodySmall }, details: { backgroundColor: color.surface, color: color.textPrimary, ...typography.bodySmall, padding: spacing.md }, retention: { color: color.textSecondary, ...typography.bodySmall, fontStyle: 'italic' },
});
