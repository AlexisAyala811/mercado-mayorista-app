import { backOrHome } from "@/navigation/back-or-home";
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useSession } from '@/features/auth/session/session-provider';
import {
  createAssistant,
  createDelegation,
  deactivateAssistant,
  listAssistants,
  listDelegations,
  resetAssistantPassword,
  revokeDelegation,
  type Assistant,
  type Delegation,
} from '@/services/api/administration-api';
import { AppButton, AppCard, AppScreen, ConfirmationDialog, EmptyState, FeedbackState, FormField, LoadingState, ScreenHeader } from '@/ui/components';
import { color, spacing, typography } from '@/ui/tokens';

type Confirmation = { kind: 'deactivate'; assistant: Assistant } | { kind: 'revoke'; delegation: Delegation } | null;

export function AdministrationScreen() {
  const router = useRouter();
  const { session } = useSession();
  const token = session?.accessToken ?? '';
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [selected, setSelected] = useState<Assistant | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [startsAt, setStartsAt] = useState(defaultStart());
  const [expiresAt, setExpiresAt] = useState(defaultEnd());
  const [reason, setReason] = useState('');
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [renderTime] = useState(() => Date.now());

  async function load() {
    try {
      const [users, replacements] = await Promise.all([listAssistants(token), listDelegations(token)]);
      setAssistants(users.items);
      setDelegations(replacements.items);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo cargar la administración.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    Promise.all([listAssistants(token), listDelegations(token)])
      .then(([users, replacements]) => {
        if (active) { setAssistants(users.items); setDelegations(replacements.items); }
      })
      .catch((requestError) => { if (active) setError(requestError instanceof Error ? requestError.message : 'No se pudo cargar la administración.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  async function addAssistant() {
    if (!username.trim() || password.length < 12) {
      setError('Ingresa un usuario y una contraseña de al menos 12 caracteres.');
      return;
    }
    await execute(async () => {
      await createAssistant(token, { username: username.trim(), password });
      setUsername(''); setPassword(''); setSuccess('Encargado creado.');
    });
  }

  async function changePassword(assistant: Assistant) {
    if (password.length < 12) { setError('La nueva contraseña debe tener al menos 12 caracteres.'); return; }
    await execute(async () => {
      await resetAssistantPassword(token, assistant.id, password);
      setPassword(''); setSuccess('Contraseña restablecida y sesiones anteriores revocadas.');
    });
  }

  async function addDelegation() {
    if (!selected) { setError('Selecciona un Encargado.'); return; }
    const start = Date.parse(startsAt); const end = Date.parse(expiresAt);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end - start > 86_400_000) {
      setError('Ingresa fechas ISO válidas; el reemplazo debe durar entre un instante y 24 horas.');
      return;
    }
    await execute(async () => {
      await createDelegation(token, selected.id, { startsAt: new Date(start).toISOString(), expiresAt: new Date(end).toISOString(), reason: reason.trim() || undefined });
      setReason(''); setSuccess('Reemplazo autorizado.');
    });
  }

  async function confirmAction() {
    if (!confirmation) return;
    const current = confirmation;
    setConfirmation(null);
    await execute(async () => {
      if (current.kind === 'deactivate') await deactivateAssistant(token, current.assistant.id);
      else await revokeDelegation(token, current.delegation.id);
      setSuccess(current.kind === 'deactivate' ? 'Encargado desactivado.' : 'Reemplazo revocado.');
    });
  }

  async function execute(action: () => Promise<void>) {
    setBusy(true); setError(null); setSuccess(null);
    try { await action(); await load(); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'No se pudo completar la operación.'); }
    finally { setBusy(false); }
  }

  if (!session || session.user.role !== 'wholesaler') return null;
  if (loading) return <AppScreen contentContainerStyle={styles.center} scrollable={false}><LoadingState label="Cargando administración" /></AppScreen>;

  return (
    <>
      <AppScreen contentContainerStyle={styles.screen}>
        <View style={styles.top}><AppButton label="Volver" onPress={() => backOrHome(router)} tone="secondary" /><AppButton label="Actualizar" onPress={() => void load()} tone="secondary" /></View>
        <ScreenHeader eyebrow="ADMINISTRACIÓN" title="Encargados y reemplazos" description="Gestiona credenciales individuales y autorizaciones temporales de hasta 24 horas." />
        {error ? <FeedbackState title="Revisa la operación" message={error} tone="error" /> : null}
        {success ? <FeedbackState title="Operación confirmada" message={success} tone="success" /> : null}
        <AppCard title="Crear Encargado">
          <FormField autoCapitalize="none" label="Usuario" onChangeText={setUsername} value={username} />
          <FormField label="Contraseña inicial" onChangeText={setPassword} secureTextEntry supportingText="Mínimo 12 caracteres." value={password} />
          <View style={styles.actions}><AppButton disabled={busy} label="Crear Encargado" onPress={() => void addAssistant()} /></View>
        </AppCard>
        <AppCard title="Encargados">
          {assistants.length ? assistants.map((assistant) => (
            <View key={assistant.id} style={styles.row}>
              <View style={styles.copy}><Text style={styles.title}>{assistant.username}</Text><Text style={styles.meta}>{assistant.isActive ? 'Activo' : 'Desactivado'}</Text></View>
              <View style={styles.actions}>
                {assistant.isActive ? <AppButton label={selected?.id === assistant.id ? 'Seleccionado' : 'Autorizar reemplazo'} onPress={() => setSelected(assistant)} tone="secondary" /> : null}
                {assistant.isActive ? <AppButton disabled={password.length < 12 || busy} label="Usar contraseña escrita" onPress={() => void changePassword(assistant)} tone="secondary" /> : null}
                {assistant.isActive ? <AppButton label="Desactivar" onPress={() => setConfirmation({ kind: 'deactivate', assistant })} tone="secondary" /> : null}
              </View>
            </View>
          )) : <EmptyState title="Sin Encargados" message="Crea una cuenta individual para autorizar reemplazos." />}
        </AppCard>
        <AppCard title="Nuevo reemplazo" description={selected ? `Encargado: ${selected.username}` : 'Selecciona un Encargado activo en la lista anterior.'}>
          <FormField autoCapitalize="none" label="Inicio (ISO 8601)" onChangeText={setStartsAt} value={startsAt} />
          <FormField autoCapitalize="none" label="Fin (ISO 8601)" onChangeText={setExpiresAt} value={expiresAt} />
          <FormField label="Motivo" onChangeText={setReason} value={reason} />
          <View style={styles.actions}><AppButton disabled={!selected || busy} label="Autorizar reemplazo" onPress={() => void addDelegation()} /></View>
        </AppCard>
        <AppCard title="Historial de reemplazos">
          {delegations.length ? delegations.map((delegation) => {
            const assistant = assistants.find((item) => item.id === delegation.assistantUserId);
            const active = !delegation.revokedAt && Date.parse(delegation.expiresAt) > renderTime;
            return <View key={delegation.id} style={styles.row}><View style={styles.copy}><Text style={styles.title}>{assistant?.username ?? 'Encargado'}</Text><Text style={styles.meta}>{new Date(delegation.startsAt).toLocaleString('es-PE')} – {new Date(delegation.expiresAt).toLocaleString('es-PE')} · {delegation.revokedAt ? 'Revocado' : active ? 'Vigente' : 'Finalizado'}</Text>{delegation.reason ? <Text style={styles.meta}>{delegation.reason}</Text> : null}</View>{active ? <AppButton label="Revocar" onPress={() => setConfirmation({ kind: 'revoke', delegation })} tone="secondary" /> : null}</View>;
          }) : <EmptyState title="Sin reemplazos" message="Aún no existen autorizaciones registradas." />}
        </AppCard>
      </AppScreen>
      <ConfirmationDialog confirmLabel={confirmation?.kind === 'deactivate' ? 'Desactivar' : 'Revocar'} message="La acción revocará las sesiones vigentes del Encargado y quedará auditada." onCancel={() => setConfirmation(null)} onConfirm={() => void confirmAction()} title="¿Confirmar acción?" visible={Boolean(confirmation)} />
    </>
  );
}

function defaultStart() { return new Date().toISOString(); }
function defaultEnd() { return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(); }

const styles = StyleSheet.create({
  screen: { gap: spacing.xl }, center: { justifyContent: 'center' }, top: { flexDirection: 'row', justifyContent: 'space-between' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'flex-end' },
  row: { alignItems: 'center', borderBottomColor: color.border, borderBottomWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'space-between', paddingVertical: spacing.md },
  copy: { flexBasis: 260, flexGrow: 1, gap: spacing.xs }, title: { color: color.textPrimary, ...typography.body, fontWeight: '700' }, meta: { color: color.textSecondary, ...typography.bodySmall },
});
