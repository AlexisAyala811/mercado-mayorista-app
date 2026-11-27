import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { generateTemporaryPassword, groupForReading } from '@/features/merchants/temporary-password';
import { createOperationId } from '@/domain/reception/reception';
import { useSession } from '@/features/auth/session/session-provider';
import { ApiError, ApiUnavailableError } from '@/services/api/api-client';
import {
  createMerchant,
  getMerchantStatus,
  listMerchants,
  reactivateMerchant,
  resetMerchantPassword,
  revokeMerchantSessions,
  suspendMerchant,
  type Merchant,
  type MerchantStatus,
} from '@/services/api/merchants-api';
import { AppButton, AppCard, AppScreen, ConfirmationDialog, EmptyState, FeedbackState, FormField, LoadingState, ScreenHeader } from '@/ui/components';
import { color, spacing, typography } from '@/ui/tokens';

type SupportAction = 'suspend' | 'reactivate' | 'reset' | 'sessions';

const confirmations: Record<SupportAction, { confirm: string; message: string; title: string }> = {
  reactivate: { confirm: 'Reactivar', message: 'El Mayorista y sus Encargados podrán volver a ingresar.', title: '¿Reactivar el comerciante?' },
  reset: { confirm: 'Restablecer', message: 'La contraseña anterior deja de valer y se cierran sus sesiones. Al ingresar deberá crear una nueva.', title: '¿Restablecer la contraseña?' },
  sessions: { confirm: 'Cerrar sesiones', message: 'Todas las tablets del comerciante tendrán que ingresar de nuevo. Lo que esté en la cola de la tablet se conserva.', title: '¿Cerrar todas las sesiones?' },
  suspend: { confirm: 'Suspender', message: 'Nadie del comerciante podrá ingresar y sus sesiones se cierran al instante. Sus datos no se borran.', title: '¿Suspender el comerciante?' },
};

// Spec 023: the Administrator's only screen. It manages merchant accounts and
// gives support; it never shows purchases, sales, accounts or reports.
export function MerchantsScreen() {
  const { logout, session } = useSession();
  const token = session?.accessToken ?? '';
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [handOver, setHandOver] = useState<{ password: string; username: string } | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [username, setUsername] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [selected, setSelected] = useState<Merchant | null>(null);
  const [status, setStatus] = useState<MerchantStatus | null>(null);
  const [reason, setReason] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [pending, setPending] = useState<SupportAction | null>(null);
  // One clientOperationId per attempt: a retry after a lost connection reuses
  // it, so the server answers with the first result instead of acting twice.
  const operations = useRef(new Map<string, string>());
  const operationFor = (key: string) => {
    const existing = operations.current.get(key);
    if (existing) return existing;
    const created = createOperationId();
    operations.current.set(key, created);
    return created;
  };

  const load = useCallback(async (query: string) => {
    try {
      const page = await listMerchants(token, query);
      setMerchants(page.items);
      setTotal(page.total);
    } catch (requestError) {
      setError(messageFor(requestError, 'No se pudo cargar la lista de comerciantes.'));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    let active = true;
    listMerchants(token)
      .then((page) => { if (active) { setMerchants(page.items); setTotal(page.total); } })
      .catch((requestError) => { if (active) setError(messageFor(requestError, 'No se pudo cargar la lista de comerciantes.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  async function openSupport(merchant: Merchant) {
    setSelected(merchant); setStatus(null); setReason(''); setResetPassword(''); setError(null); setSuccess(null); setHandOver(null);
    try { setStatus(await getMerchantStatus(token, merchant.id)); }
    catch (requestError) { setError(messageFor(requestError, 'No se pudo leer el estado de la cuenta.')); }
  }

  async function run(key: string, action: (operationId: string) => Promise<void>) {
    setBusy(true); setError(null); setSuccess(null);
    try {
      await action(operationFor(key));
      operations.current.delete(key);
    } catch (requestError) {
      // Only a lost connection keeps the id for the retry.
      if (!(requestError instanceof ApiUnavailableError)) operations.current.delete(key);
      setError(messageFor(requestError, 'No se pudo completar la operación.'));
    } finally {
      setBusy(false);
    }
  }

  async function addMerchant() {
    if (!businessName.trim() || !username.trim()) { setError('Escribe el nombre del negocio y el usuario del Mayorista.'); return; }
    if (temporaryPassword.length < 12) { setError('Genera o escribe una contraseña temporal de al menos 12 caracteres.'); return; }
    const key = `create:${businessName.trim()}:${username.trim().toLowerCase()}:${temporaryPassword}`;
    await run(key, async (clientOperationId) => {
      const created = await createMerchant(token, { businessName: businessName.trim(), clientOperationId, temporaryPassword, username: username.trim() });
      setHandOver({ password: temporaryPassword, username: created.wholesaler?.username ?? username.trim() });
      setSuccess(`Comerciante «${created.displayName}» creado.`);
      setBusinessName(''); setUsername(''); setTemporaryPassword('');
      await load(search);
    });
  }

  async function confirmSupport() {
    if (!selected || !pending) return;
    const action = pending;
    setPending(null);
    const trimmed = reason.trim();
    const key = `${action}:${selected.id}:${trimmed}:${action === 'reset' ? resetPassword : ''}`;
    await run(key, async (clientOperationId) => {
      const body = { clientOperationId, reason: trimmed };
      if (action === 'suspend') await suspendMerchant(token, selected.id, body);
      if (action === 'reactivate') await reactivateMerchant(token, selected.id, body);
      if (action === 'reset') {
        await resetMerchantPassword(token, selected.id, { ...body, temporaryPassword: resetPassword });
        setHandOver({ password: resetPassword, username: selected.wholesaler?.username ?? '' });
        setResetPassword('');
      }
      if (action === 'sessions') {
        const result = await revokeMerchantSessions(token, selected.id, body);
        setSuccess(result.revokedSessions === 1 ? 'Se cerró 1 sesión.' : `Se cerraron ${result.revokedSessions} sesiones.`);
      } else {
        setSuccess({ reactivate: 'Comerciante reactivado.', reset: 'Contraseña temporal asignada.', suspend: 'Comerciante suspendido.' }[action]);
      }
      setReason('');
      const refreshed = await getMerchantStatus(token, selected.id);
      setStatus(refreshed); setSelected(refreshed.merchant);
      await load(search);
    });
  }

  function askSupport(action: SupportAction) {
    if (reason.trim().length < 3) { setError('Escribe el motivo de la acción (queda en la auditoría del comerciante).'); return; }
    if (action === 'reset' && resetPassword.length < 12) { setError('Genera o escribe una contraseña temporal de al menos 12 caracteres.'); return; }
    setError(null);
    setPending(action);
  }

  if (!session || session.user.role !== 'admin') return null;
  if (loading) return <AppScreen contentContainerStyle={styles.center} scrollable={false}><LoadingState label="Cargando comerciantes" /></AppScreen>;

  return (
    <>
      <AppScreen contentContainerStyle={styles.screen}>
        <ScreenHeader eyebrow="SOPORTE MAÑAY" title="Comerciantes" description="Das de alta a cada comerciante y atiendes su cuenta. No ves sus compras, ventas ni cuentas." />
        <View style={styles.top}>
          <AppButton label="Actualizar" onPress={() => void load(search)} tone="secondary" />
          <AppButton label="Cerrar sesión" onPress={() => void logout()} tone="secondary" />
        </View>
        {error ? <FeedbackState title="Revisa la operación" message={error} tone="error" /> : null}
        {success ? <FeedbackState title="Operación confirmada" message={success} tone="success" /> : null}
        {handOver ? (
          <AppCard title="Entrega estos datos al Mayorista">
            <Text style={styles.meta}>Usuario</Text>
            <Text selectable style={styles.secret}>{handOver.username}</Text>
            <Text style={styles.meta}>Contraseña temporal</Text>
            <Text accessibilityLabel={`Contraseña temporal ${handOver.password.split('').join(' ')}`} selectable style={styles.secret}>{groupForReading(handOver.password)}</Text>
            <Text style={styles.meta}>Se muestra solo ahora. Al ingresar, el Mayorista creará su propia contraseña.</Text>
            <View style={styles.actions}><AppButton label="Ya la entregué" onPress={() => setHandOver(null)} /></View>
          </AppCard>
        ) : null}

        <AppCard title="Nuevo comerciante" description="Crea el negocio y la cuenta de su Mayorista. El Mayorista luego crea a sus Encargados.">
          <FormField label="Nombre del negocio" onChangeText={setBusinessName} value={businessName} />
          <FormField autoCapitalize="none" label="Usuario del Mayorista" onChangeText={setUsername} value={username} />
          <FormField autoCapitalize="none" label="Contraseña temporal" onChangeText={setTemporaryPassword} supportingText="Mínimo 12 caracteres. El Mayorista la cambia al ingresar." value={temporaryPassword} />
          <View style={styles.actions}>
            <AppButton disabled={busy} label="Generar contraseña" onPress={() => setTemporaryPassword(generateTemporaryPassword())} tone="secondary" />
            <AppButton disabled={busy} label="Crear comerciante" onPress={() => void addMerchant()} />
          </View>
        </AppCard>

        <AppCard title={`Comerciantes (${total})`}>
          <FormField appearance="search" autoCapitalize="none" hideLabel label="Buscar comerciante" onChangeText={setSearch} onSubmitEditing={() => void load(search)} placeholder="Negocio o usuario" returnKeyType="search" value={search} />
          {merchants.length ? merchants.map((merchant) => (
            <View key={merchant.id} style={styles.row}>
              <View style={styles.copy}>
                <Text style={styles.title}>{merchant.displayName}</Text>
                <Text style={styles.meta}>{`${merchant.wholesaler?.username ?? 'Sin Mayorista'} · ${merchant.isActive ? 'Activo' : 'Suspendido'}`}</Text>
                <Text style={styles.meta}>{merchant.wholesaler?.mustChangePassword ? 'Aún no crea su contraseña' : `Último acceso: ${formatDate(merchant.wholesaler?.lastLoginAt ?? null)}`}</Text>
              </View>
              <AppButton label={selected?.id === merchant.id ? 'Seleccionado' : 'Ver soporte'} onPress={() => void openSupport(merchant)} tone="secondary" />
            </View>
          )) : <EmptyState title="Sin comerciantes" message={search.trim() ? 'Ninguno coincide con la búsqueda.' : 'Crea el primero con el formulario de arriba.'} />}
        </AppCard>

        {selected ? (
          <AppCard title={`Soporte · ${selected.displayName}`} description={selected.isActive ? 'Cuenta activa.' : 'Cuenta suspendida: nadie del comerciante puede ingresar.'}>
            {status ? (
              <View style={styles.facts}>
                <Fact label="Último acceso" value={formatDate(status.merchant.wholesaler?.lastLoginAt ?? null)} />
                <Fact label="Intentos fallidos" value={String(status.failedLoginAttempts)} />
                <Fact label="Sesiones abiertas" value={String(status.openSessions)} />
                <Fact label="Encargados activos" value={String(status.activeAssistants)} />
              </View>
            ) : <LoadingState label="Leyendo el estado" />}
            <FormField label="Motivo" onChangeText={setReason} supportingText="Obligatorio. Lo verá el comerciante en su auditoría." value={reason} />
            <View style={styles.actions}>
              {selected.isActive
                ? <AppButton disabled={busy} label="Suspender" onPress={() => askSupport('suspend')} tone="secondary" />
                : <AppButton disabled={busy} label="Reactivar" onPress={() => askSupport('reactivate')} tone="secondary" />}
              <AppButton disabled={busy} label="Cerrar sesiones" onPress={() => askSupport('sessions')} tone="secondary" />
            </View>
            <Text style={styles.label}>¿Olvidó su contraseña?</Text>
            <FormField autoCapitalize="none" label="Contraseña temporal nueva" onChangeText={setResetPassword} value={resetPassword} />
            <View style={styles.actions}>
              <AppButton disabled={busy} label="Generar contraseña" onPress={() => setResetPassword(generateTemporaryPassword())} tone="secondary" />
              <AppButton disabled={busy} label="Restablecer contraseña" onPress={() => askSupport('reset')} />
            </View>
          </AppCard>
        ) : null}
      </AppScreen>
      <ConfirmationDialog
        busy={busy}
        confirmLabel={pending ? confirmations[pending].confirm : 'Confirmar'}
        message={pending ? confirmations[pending].message : ''}
        onCancel={() => setPending(null)}
        onConfirm={() => void confirmSupport()}
        title={pending ? confirmations[pending].title : ''}
        visible={Boolean(pending)}
      />
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return <View style={styles.fact}><Text style={styles.meta}>{label}</Text><Text style={styles.title}>{value}</Text></View>;
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Lima' }) : 'Nunca';
}

function messageFor(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.code === 'username-taken') return 'Ese usuario ya existe. Elige otro para el Mayorista.';
    if (error.code === 'operation-id-conflict') return 'Cambiaste los datos de una operación pendiente. Vuelve a intentar.';
    return error.message;
  }
  if (error instanceof ApiUnavailableError) return 'Sin conexión. Reintenta: la operación no se duplicará.';
  return fallback;
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl },
  center: { justifyContent: 'center' },
  top: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'flex-end' },
  row: { alignItems: 'center', borderBottomColor: color.border, borderBottomWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'space-between', paddingVertical: spacing.md },
  copy: { flexBasis: 240, flexGrow: 1, gap: spacing.xs },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  fact: { flexBasis: 140, flexGrow: 1, gap: spacing.xs },
  title: { color: color.textPrimary, ...typography.body, fontWeight: '700' },
  meta: { color: color.textSecondary, ...typography.bodySmall },
  label: { color: color.textPrimary, ...typography.bodySmall, fontWeight: '700' },
  secret: { color: color.textPrimary, ...typography.body, fontFamily: 'monospace', fontWeight: '700', letterSpacing: 1 },
});
