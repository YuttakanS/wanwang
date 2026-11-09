import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { buildMonthCells } from '@/lib/monthCells';
import { formatDateToISO, formatLocalizedDate } from '@/lib/timeUtils';
import { DayGrid } from '~/components/calendar/DayGrid';
import { NeoButton } from '~/components/neo/NeoButton';
import { NeoText } from '~/components/neo/NeoText';
import { borderWidths } from '~/constants/theme';
import { useSelectionStore } from '~/hooks/useSelectionStore';
import { useTheme } from '~/hooks/useTheme';

// Temporary screen for testing the calendar on a real phone. Phase 3 replaces it with the real home.
const RANGE_DAYS = 45;

export default function CalendarTestScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { store, slots, outsideVersion } = useSelectionStore();
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
  const spacerStyle = [styles.spacer, { borderColor: colors.lineSoft }];

  return (
    <ScrollView
      scrollEnabled={!dragging}
      style={{ flex: 1, backgroundColor: colors.surface }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}
    >
      <NeoText variant="title">ทดสอบปฏิทิน</NeoText>
      <NeoText tone="muted">แตะเพื่อเลือกหรือเอาออก กดค้างแล้วลากเพื่อเลือกหลายวัน เลื่อนจอเริ่มจากบนปฏิทินต้องไม่เลือกวัน</NeoText>
      {__DEV__ && <NeoButton label="ดูระบบดีไซน์" variant="secondary" size="sm" onPress={() => router.push('/preview')} />}

      <View style={spacerStyle}>
        <NeoText tone="muted">พื้นที่ว่าง เพื่อให้หน้าเลื่อนได้</NeoText>
      </View>

      <View style={styles.row}>
        <NeoButton label="<" variant="secondary" size="sm" accessibilityLabel="เดือนก่อนหน้า" onPress={() => shiftMonth(-1)} />
        <NeoText variant="label">{formatLocalizedDate(monthId, 'th', 'monthYear')}</NeoText>
        <NeoButton label=">" variant="secondary" size="sm" accessibilityLabel="เดือนถัดไป" onPress={() => shiftMonth(1)} />
      </View>

      <DayGrid
        key={monthId}
        days={days}
        store={store}
        outsideVersion={outsideVersion}
        labelFor={day => formatLocalizedDate(day.dateStr, 'th', 'chip')}
        onDraggingChange={setDragging}
      />

      <View style={styles.row}>
        <NeoText variant="label">เลือกแล้ว: {slots.length} วัน</NeoText>
        <NeoButton label="ล้าง" variant="secondary" size="sm" onPress={() => store.replace([])} />
      </View>
      <NeoText tone="muted">{[...slots].sort().join(', ') || '-'}</NeoText>

      <View style={spacerStyle}>
        <NeoText tone="muted">พื้นที่ว่าง เพื่อให้หน้าเลื่อนได้</NeoText>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 12 },
  spacer: { height: 280, justifyContent: 'center', alignItems: 'center', borderWidth: borderWidths.thin },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
