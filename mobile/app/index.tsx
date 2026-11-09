import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { buildMonthCells } from '@/lib/monthCells';
import { formatDateToISO, formatLocalizedDate } from '@/lib/timeUtils';
import { DayGrid } from '~/components/calendar/DayGrid';
import { calendarColors } from '~/constants/calendarColors';
import { useSelectionStore } from '~/hooks/useSelectionStore';

// Temporary screen for testing the calendar on a real phone. Phase 3 replaces it with the real home.
const RANGE_DAYS = 45;

export default function CalendarTestScreen() {
  const insets = useSafeAreaInsets();
  const { store, outsideVersion } = useSelectionStore();
  const [dragging, setDragging] = useState(false);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const { today, rangeEnd } = useMemo(() => {
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + RANGE_DAYS);
    return { today: formatDateToISO(now), rangeEnd: formatDateToISO(end) };
  }, []);

  const days = useMemo(() => buildMonthCells(month, today, rangeEnd, today), [month, today, rangeEnd]);
  const monthId = formatDateToISO(month);

  const shiftMonth = (delta: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1));

  return (
    <ScrollView
      scrollEnabled={!dragging}
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}
    >
      <Text style={styles.title}>ทดสอบปฏิทิน</Text>
      <Text style={styles.help}>แตะเพื่อเลือกหรือเอาออก กดค้างแล้วลากเพื่อเลือกหลายวัน เลื่อนจอเริ่มจากบนปฏิทินต้องไม่เลือกวัน</Text>

      <View style={styles.spacer}>
        <Text style={styles.help}>พื้นที่ว่าง เพื่อให้หน้าเลื่อนได้</Text>
      </View>

      <View style={styles.monthRow}>
        <Pressable accessibilityRole="button" onPress={() => shiftMonth(-1)} style={styles.button}>
          <Text style={styles.buttonText}>{'<'}</Text>
        </Pressable>
        <Text style={styles.monthText}>{formatLocalizedDate(monthId, 'th', 'monthYear')}</Text>
        <Pressable accessibilityRole="button" onPress={() => shiftMonth(1)} style={styles.button}>
          <Text style={styles.buttonText}>{'>'}</Text>
        </Pressable>
      </View>

      <DayGrid
        key={monthId}
        days={days}
        store={store}
        outsideVersion={outsideVersion}
        labelFor={day => formatLocalizedDate(day.dateStr, 'th', 'chip')}
        onDraggingChange={setDragging}
      />

      <View style={styles.resultRow}>
        <Text style={styles.count}>เลือกแล้ว: {store.size} วัน</Text>
        <Pressable accessibilityRole="button" onPress={() => store.replace([])} style={styles.button}>
          <Text style={styles.buttonText}>ล้าง</Text>
        </Pressable>
      </View>
      <Text style={styles.help}>{store.toArray().sort().join(', ') || '-'}</Text>

      <View style={styles.spacer}>
        <Text style={styles.help}>พื้นที่ว่าง เพื่อให้หน้าเลื่อนได้</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: calendarColors.surface },
  content: { paddingHorizontal: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: '700', color: calendarColors.ink },
  help: { fontSize: 14, color: calendarColors.muted },
  spacer: { height: 280, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: calendarColors.lineSoft },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthText: { fontSize: 16, fontWeight: '700', color: calendarColors.ink },
  button: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 2, borderColor: calendarColors.ink },
  buttonText: { fontSize: 14, fontWeight: '700', color: calendarColors.ink },
  resultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  count: { fontSize: 16, fontWeight: '700', color: calendarColors.ink },
});
