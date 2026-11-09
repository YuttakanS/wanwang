import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { buildMonthCells } from '@/lib/monthCells';
import { formatDateToISO, formatLocalizedDate } from '@/lib/timeUtils';
import { firstOfMonth } from '~/calendar/monthPaging';
import { type DateRange, isInPickedRange, nextRange } from '~/calendar/rangePick';
import { ON_ACCENT } from '~/constants/theme';
import { useI18n } from '~/hooks/useI18n';
import { useTheme } from '~/hooks/useTheme';
import { DisabledGridCell, GridCell, MonthGrid } from './MonthGrid';
import { MonthHeader } from './MonthHeader';

// Only limits how far the months page. The form checks the length of the chosen range.
const MAX_MONTHS_AHEAD = 24;

interface RangeCalendarProps {
  range: DateRange;
  today: string;
  onChange: (range: DateRange) => void;
}

/** Picks a first and last day with two taps, so the app needs no native date picker. */
export function RangeCalendar({ range, today, onChange }: RangeCalendarProps) {
  const { lang } = useI18n();
  const { colors } = useTheme();
  const [month, setMonth] = useState(() => firstOfMonth(range.start));

  const start = new Date();
  const lastPage = formatDateToISO(new Date(start.getFullYear(), start.getMonth() + MAX_MONTHS_AHEAD, 1));
  // Every day from today on can be chosen. Days of the neighbouring months fill out the weeks.
  const days = buildMonthCells(month, today, '9999-12-31', today);

  return (
    <View style={styles.calendar}>
      <MonthHeader month={month} rangeStart={today} rangeEnd={lastPage} onChange={setMonth} />
      <MonthGrid
        days={days}
        renderCell={day => {
          if (day.isPast) return <DisabledGridCell dayNumber={day.dayNum} />;
          const picked = isInPickedRange(range, day.dateStr);
          return (
            <GridCell
              dayNumber={day.dayNum}
              backgroundColor={picked ? colors.accent : colors.surface}
              color={picked ? ON_ACCENT : colors.ink}
              selected={picked}
              accessibilityLabel={formatLocalizedDate(day.dateStr, lang, 'chip')}
              onPress={() => onChange(nextRange(range, day.dateStr))}
            />
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  calendar: { gap: 8 },
});
