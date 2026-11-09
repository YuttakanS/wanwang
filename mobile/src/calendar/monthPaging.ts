const monthIndex = (date: string) => {
  const [year, month] = date.split('-').map(Number);
  return year * 12 + (month - 1);
};

export const firstOfMonth = (date: string) => {
  const [year, month] = date.split('-').map(Number);
  return new Date(year, month - 1, 1);
};

/** Opens on today's month when it is in range, because earlier months can no longer be chosen. */
export function initialMonth(rangeStart: string, rangeEnd: string, today: string): Date {
  if (today <= rangeStart) return firstOfMonth(rangeStart);
  return firstOfMonth(today > rangeEnd ? rangeEnd : today);
}

export function canShowMonth(month: Date, rangeStart: string, rangeEnd: string): boolean {
  const index = month.getFullYear() * 12 + month.getMonth();
  return index >= monthIndex(rangeStart) && index <= monthIndex(rangeEnd);
}
