import { formatDateToISO } from './timeUtils';

export interface MonthCell {
  dateStr: string;
  dayNum: number;
  isCurrentMonth: boolean;
  isWeekend: boolean;
  isInRange: boolean;
  isPast: boolean;
}

/** The cells of a month view, Sunday first, padded with neighbouring days to fill whole weeks. */
export function buildMonthCells(
  monthDate: Date,
  rangeStart: string,
  rangeEnd: string,
  todayStr: string
): MonthCell[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const startOffset = new Date(year, month, 1).getDay();

  const toCell = (date: Date, isCurrentMonth: boolean): MonthCell => {
    const dateStr = formatDateToISO(date);
    return {
      dateStr,
      dayNum: date.getDate(),
      isCurrentMonth,
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      isInRange: dateStr >= rangeStart && dateStr <= rangeEnd,
      isPast: dateStr < todayStr,
    };
  };

  const cells: MonthCell[] = [];
  for (let i = startOffset - 1; i >= 0; i--) cells.push(toCell(new Date(year, month, -i), false));
  for (let day = 1; day <= lastDay; day++) cells.push(toCell(new Date(year, month, day), true));
  for (let next = 1; cells.length % 7 !== 0; next++) cells.push(toCell(new Date(year, month + 1, next), false));
  return cells;
}
