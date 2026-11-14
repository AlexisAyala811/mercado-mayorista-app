import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatLocalDateInput, isValidCivilDate } from '@/domain/shared/date';
import { SymbolView } from '@/ui/components/symbol';
import { accent, color } from '@/ui/tokens';

type Props = {
  visible: boolean;
  title: string;
  value: string;
  onCancel: () => void;
  onPick: (value: string) => void;
};

const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const parse = (value: string) => (isValidCivilDate(value) ? new Date(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, Number(value.slice(8, 10))) : new Date());

// Date chosen with a tap instead of typing «aaaa-mm-dd» (spec 011, CL-ST25):
// «Hoy» and «Mañana» first, then a month calendar. No native module needed.
export function DateDialog({ onCancel, onPick, title, value, visible }: Props) {
  const selected = parse(value);
  const [month, setMonth] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1));
  const today = new Date();
  const todayValue = formatLocalDateInput(today);
  // Monday-first grid: blanks before the 1st, then the days of the month.
  const lead = (month.getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [...Array.from({ length: lead }, () => null), ...Array.from({ length: days }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1))];
  while (cells.length % 7) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, index) => cells.slice(index * 7, index * 7 + 7));

  return (
    <Modal animationType="fade" onRequestClose={onCancel} transparent visible={visible}>
      <View style={styles.backdrop}>
        <View accessibilityViewIsModal style={styles.card}>
          <View style={styles.head}>
            <Text accessibilityRole="header" style={styles.title}>{title}</Text>
            <Pressable accessibilityLabel="Cerrar" accessibilityRole="button" hitSlop={8} onPress={onCancel} style={styles.icon}>
              <SymbolView fallback={null} name={{ android: 'close', ios: 'xmark', web: 'close' }} size={20} tintColor="#475569" />
            </Pressable>
          </View>
          <View style={styles.quick}>
            {[['Hoy', today], ['Mañana', addDays(today, 1)]].map(([label, date]) => (
              <Pressable accessibilityRole="button" key={label as string} onPress={() => onPick(formatLocalDateInput(date as Date))} style={({ pressed }) => [styles.quickButton, pressed && styles.pressed]}>
                <Text style={styles.quickText}>{label as string}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.monthRow}>
            <Pressable accessibilityLabel="Mes anterior" accessibilityRole="button" onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} style={styles.icon}>
              <SymbolView fallback={null} name={{ android: 'chevron_left', ios: 'chevron.left', web: 'chevron_left' }} size={22} tintColor="#0F172A" />
            </Pressable>
            <Text accessibilityLiveRegion="polite" style={styles.month}>{monthNames[month.getMonth()]} {month.getFullYear()}</Text>
            <Pressable accessibilityLabel="Mes siguiente" accessibilityRole="button" onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} style={styles.icon}>
              <SymbolView fallback={null} name={{ android: 'chevron_right', ios: 'chevron.right', web: 'chevron_right' }} size={22} tintColor="#0F172A" />
            </Pressable>
          </View>
          <View style={styles.week}>{weekDays.map((day, index) => <Text key={index} style={styles.weekDay}>{day}</Text>)}</View>
          {weeks.map((week, row) => (
            <View key={row} style={styles.week}>
              {week.map((date, index) => {
                if (!date) return <View key={index} style={styles.day} />;
                const dayValue = formatLocalDateInput(date);
                const isSelected = dayValue === value;
                const isToday = dayValue === todayValue;
                return (
                  <Pressable accessibilityLabel={`${date.getDate()} de ${monthNames[date.getMonth()]!.toLowerCase()} de ${date.getFullYear()}`} accessibilityRole="button" accessibilityState={{ selected: isSelected }} key={index} onPress={() => onPick(dayValue)} style={({ pressed }) => [styles.day, isToday && styles.today, isSelected && styles.selected, pressed && styles.pressed]}>
                    <Text style={[styles.dayText, isSelected && styles.selectedText]}>{date.getDate()}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { alignItems: 'center', backgroundColor: 'rgba(15,23,42,0.45)', flex: 1, justifyContent: 'center', padding: 24 },
  card: { backgroundColor: color.surfaceRaised, borderRadius: 16, boxShadow: '0px 16px 40px rgba(15,23,42,0.25)', gap: 6, maxWidth: 400, padding: 18, width: '100%' },
  head: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  title: { color: '#0F172A', fontSize: 18, fontWeight: '700' },
  icon: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  quick: { flexDirection: 'row', gap: 10, paddingVertical: 4 },
  quickButton: { alignItems: 'center', backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', borderRadius: 10, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 44 },
  quickText: { color: accent.emerald.pillInk, fontSize: 15, fontWeight: '700' },
  monthRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  month: { color: '#0F172A', fontSize: 16, fontWeight: '700' },
  week: { flexDirection: 'row' },
  weekDay: { color: '#64748B', flex: 1, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  day: { alignItems: 'center', aspectRatio: 1, borderRadius: 22, flex: 1, justifyContent: 'center', maxHeight: 44 },
  dayText: { color: '#0F172A', fontSize: 15 },
  today: { borderColor: '#047857', borderWidth: 1 },
  selected: { backgroundColor: '#047857' },
  selectedText: { color: '#FFFFFF', fontWeight: '700' },
  pressed: { opacity: 0.6 },
});
