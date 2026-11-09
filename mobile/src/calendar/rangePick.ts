export interface DateRange {
  start: string;
  /** Null while waiting for the second tap. */
  end: string | null;
}

/** First tap starts a range and the second ends it. A tap that cannot be its end starts again. */
export function nextRange(range: DateRange | null, tapped: string): DateRange {
  if (!range || range.end !== null || tapped < range.start) return { start: tapped, end: null };
  return { start: range.start, end: tapped };
}

export function isInPickedRange(range: DateRange | null, date: string): boolean {
  if (!range) return false;
  return date >= range.start && date <= (range.end ?? range.start);
}
