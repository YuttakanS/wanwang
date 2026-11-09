import { describe, expect, it } from 'vitest';
import { buildMonthCells } from './monthCells';

const ids = (cells: { dateStr: string }[]) => cells.map(c => c.dateStr);

describe('buildMonthCells', () => {
  it('starts on Sunday and fills whole weeks with neighbouring days', () => {
    // 1 November 2026 is a Sunday, and the month ends on a Monday.
    const cells = buildMonthCells(new Date(2026, 10, 1), '2026-11-01', '2026-11-30', '2026-11-01');
    expect(cells).toHaveLength(35);
    expect(cells[0].dateStr).toBe('2026-11-01');
    expect(cells.at(-1)?.dateStr).toBe('2026-12-05');
    expect(cells.at(-1)?.isCurrentMonth).toBe(false);
  });

  it('pads the start of a month that does not begin on Sunday', () => {
    // 1 December 2026 is a Tuesday.
    const cells = buildMonthCells(new Date(2026, 11, 1), '2026-12-01', '2026-12-31', '2026-12-01');
    expect(ids(cells).slice(0, 3)).toEqual(['2026-11-29', '2026-11-30', '2026-12-01']);
    expect(cells[0].isCurrentMonth).toBe(false);
    expect(cells[2].isCurrentMonth).toBe(true);
  });

  it('has 28 cells when February fits exactly', () => {
    // February 2026 starts on a Sunday.
    expect(buildMonthCells(new Date(2026, 1, 1), '2026-02-01', '2026-02-28', '2026-02-01')).toHaveLength(28);
  });

  it('never has more than 42 cells, which the mobile cell mask relies on', () => {
    for (let year = 2024; year <= 2032; year++) {
      for (let month = 0; month < 12; month++) {
        const cells = buildMonthCells(new Date(year, month, 1), '2000-01-01', '2100-01-01', '2000-01-01');
        expect(cells.length).toBeLessThanOrEqual(42);
        expect(cells.length % 7).toBe(0);
      }
    }
  });

  it('marks range, past and weekend', () => {
    const cells = buildMonthCells(new Date(2026, 10, 1), '2026-11-10', '2026-11-20', '2026-11-12');
    const cell = (id: string) => cells.find(c => c.dateStr === id)!;

    expect(cell('2026-11-09').isInRange).toBe(false);
    expect(cell('2026-11-10').isInRange).toBe(true);
    expect(cell('2026-11-20').isInRange).toBe(true);
    expect(cell('2026-11-21').isInRange).toBe(false);
    expect(cell('2026-11-11').isPast).toBe(true);
    expect(cell('2026-11-12').isPast).toBe(false);
    expect(cell('2026-11-14').isWeekend).toBe(true);
    expect(cell('2026-11-16').isWeekend).toBe(false);
  });
});
