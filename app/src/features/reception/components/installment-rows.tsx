import { useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';

import { DateDialog } from '@/features/sales/components/date-dialog';
import { AppButton, FormField } from '@/ui/components';
import { SymbolView } from '@/ui/components/symbol';

export type InstallmentRow = { id: string; dueOn: string; amount: string };

type Props = {
  installments: InstallmentRow[];
  busy?: boolean;
  onChange: (id: string, field: 'amount' | 'dueOn', value: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
};

// Installments of a credit purchase or sale (spec 011, CL-ST29): the due date
// is picked in the calendar like every other date of the sheet, and «Agregar
// cuota» starts with the amount still missing (the parent prefills it).
export function InstallmentRows({ busy = false, installments, onAdd, onChange, onRemove }: Props) {
  const [dateFor, setDateFor] = useState<string | null>(null);
  const editing = installments.find((item) => item.id === dateFor);
  return (
    <View style={styles.box} testID="installments">
      <Text style={styles.help}>Las cuotas deben sumar exactamente el total neto.</Text>
      {installments.map((item, index) => (
        <View key={item.id} style={styles.row}>
          <View style={styles.field}>
            <Text style={styles.label}>VENCIMIENTO CUOTA {index + 1}</Text>
            <Pressable accessibilityHint="Abre el calendario" accessibilityLabel={`Vencimiento cuota ${index + 1}: ${item.dueOn || 'sin fecha'}`} accessibilityRole="button" disabled={busy} onPress={() => { Keyboard.dismiss(); setDateFor(item.id); }} style={({ pressed }) => [styles.control, pressed && styles.pressed]}>
              <SymbolView fallback={null} name={{ android: 'calendar_today', ios: 'calendar', web: 'calendar_today' }} size={20} tintColor="#74777F" />
              <Text style={[styles.value, !item.dueOn && styles.placeholder]}>{item.dueOn || 'Elegir fecha'}</Text>
            </Pressable>
          </View>
          <View style={styles.field}>
            <FormField accessibilityLabel={`Importe cuota ${index + 1} (S/)`} appearance="stitch" autoComplete="off" autoCorrect={false} editable={!busy} importantForAutofill="no" keyboardType="decimal-pad" label="Importe (S/)" onChangeText={(value) => onChange(item.id, 'amount', value)} placeholder="0.00" value={item.amount} />
          </View>
          <View style={styles.remove}><AppButton accessibilityLabel={`Quitar cuota ${index + 1}`} disabled={busy} label="Quitar" onPress={() => onRemove(item.id)} tone="secondary" /></View>
        </View>
      ))}
      <AppButton disabled={busy} label="Agregar cuota" onPress={onAdd} tone="secondary" />
      {editing ? <DateDialog onCancel={() => setDateFor(null)} onPick={(value) => { onChange(editing.id, 'dueOn', value); setDateFor(null); }} title="Vencimiento de la cuota" value={editing.dueOn} visible /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 12 },
  help: { color: '#424844', fontSize: 13 },
  row: { alignItems: 'flex-end', flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  field: { flexBasis: 220, flexGrow: 1, gap: 6 },
  remove: { flexBasis: 120 },
  label: { color: '#64748B', fontSize: 12, fontWeight: '600', letterSpacing: 0.8, lineHeight: 16 },
  control: { alignItems: 'center', backgroundColor: '#EFF4FF', borderRadius: 12, flexDirection: 'row', gap: 10, minHeight: 44, paddingHorizontal: 13 },
  value: { color: '#0B1C30', fontSize: 14, fontWeight: '500' },
  placeholder: { color: '#64748B' },
  pressed: { opacity: 0.6 },
});
