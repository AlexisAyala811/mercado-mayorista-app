import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ApiError, ApiUnavailableError } from '@/services/api/api-client';
import { AppButton, AppCard, AppScreen, FeedbackState, FormField, ScreenHeader } from '@/ui/components';
import { color, spacing, typography } from '@/ui/tokens';

type Props = {
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  onLogout: () => void;
  username: string;
};

export function validateNewPassword(current: string, next: string, confirmation: string) {
  if (!current) return 'Escribe la contraseña temporal que te dieron.';
  if (next.length < 12) return 'La contraseña nueva debe tener al menos 12 caracteres.';
  if (next === current) return 'La contraseña nueva debe ser distinta de la temporal.';
  if (next !== confirmation) return 'Las dos contraseñas nuevas no coinciden.';
  return null;
}

// Spec 023 (CL-23-03): after a temporary password from support, the session
// only allows this. The Administrator never learns the final password.
export function ChangePasswordScreen({ onChangePassword, onLogout, username }: Props) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const invalid = validateNewPassword(current, next, confirmation);
    if (invalid) { setError(invalid); return; }
    setBusy(true); setError(null);
    try {
      await onChangePassword(current, next);
    } catch (requestError) {
      setError(messageFor(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppScreen contentContainerStyle={styles.screen}>
      <ScreenHeader
        eyebrow="PRIMER ACCESO"
        title="Crea tu contraseña"
        description={`Hola, ${username}. Ingresaste con una contraseña temporal. Crea una propia para continuar; solo tú la conocerás.`}
      />
      {error ? <FeedbackState title="Revisa los datos" message={error} tone="error" /> : null}
      <AppCard title="Nueva contraseña">
        <FormField autoCapitalize="none" autoComplete="current-password" label="Contraseña temporal" onChangeText={setCurrent} secureTextEntry value={current} />
        <FormField autoCapitalize="none" autoComplete="new-password" label="Contraseña nueva" onChangeText={setNext} secureTextEntry supportingText="Mínimo 12 caracteres." value={next} />
        <FormField autoCapitalize="none" autoComplete="new-password" label="Repite la contraseña nueva" onChangeText={setConfirmation} onSubmitEditing={() => void submit()} secureTextEntry value={confirmation} />
        <Text style={styles.help}>Al guardarla se cierran tus sesiones en otros dispositivos.</Text>
        <View style={styles.actions}>
          <AppButton disabled={busy} label="Cerrar sesión" onPress={onLogout} tone="secondary" />
          <AppButton disabled={busy} label={busy ? 'Guardando…' : 'Guardar contraseña'} onPress={() => void submit()} />
        </View>
      </AppCard>
    </AppScreen>
  );
}

function messageFor(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === 'current-password-incorrect') return 'La contraseña temporal no es correcta.';
    if (error.status === 429) return 'Demasiados intentos. Espera un minuto y vuelve a intentar.';
    return error.message;
  }
  if (error instanceof ApiUnavailableError) return 'Necesitas conexión para crear tu contraseña. Revisa la red e intenta de nuevo.';
  return 'No se pudo guardar la contraseña.';
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'flex-end' },
  help: { color: color.textSecondary, ...typography.bodySmall },
});
