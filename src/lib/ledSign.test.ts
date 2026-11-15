import { describe, expect, it } from 'vitest';
import { copyStarts, ledColor, stripColumns } from './ledSign';

describe('ledColor', () => {
  it.each(['#ffe500', '#ff3b30', '#39ff14', '#00e5ff', '#ffffff'])('leaves %s as it is', color => {
    expect(ledColor(color)).toBe(color);
  });

  it('turns black into a grey that can be read on the panel', () => {
    const lifted = ledColor('#000000');
    const [r, g, b] = [1, 3, 5].map(i => parseInt(lifted.slice(i, i + 2), 16));
    expect(r).toBe(g);
    expect(g).toBe(b);
    expect(r).toBeGreaterThan(80);
  });

  it('lightens a dark colour without changing which channel leads', () => {
    const lifted = ledColor('#000080');
    const [r, g, b] = [1, 3, 5].map(i => parseInt(lifted.slice(i, i + 2), 16));
    expect(b).toBeGreaterThan(0x80);
    expect(b).toBeGreaterThan(r);
    expect(r).toBe(g);
  });

  it('reads upper case, and falls back to the default for anything else', () => {
    expect(ledColor('#FFE500')).toBe('#ffe500');
    expect(ledColor('red')).toBe('#ffe500');
    expect(ledColor('')).toBe('#ffe500');
  });
});

describe('a pass of the text', () => {
  // 50 columns of text on a sign 200 columns wide.
  const text = 50;
  const view = 200;
  const strip = stripColumns(text, view);

  it('is the text followed by a gap as wide as the sign', () => {
    expect(strip).toBe(250);
    expect(stripColumns(500, 200)).toBe(700);
  });

  it('starts with the text at the left edge', () => {
    expect(copyStarts(0, strip, view)).toEqual([0]);
  });

  it('shows one copy while the text leaves on the left', () => {
    expect(copyStarts(30, strip, view)).toEqual([-30]);
  });

  it('brings the next copy in at the right edge once the text has gone', () => {
    expect(copyStarts(text, strip, view)).toEqual([-50]);
    expect(copyStarts(text + 1, strip, view)).toEqual([-51, 199]);
  });

  it('wraps around after a full pass', () => {
    expect(copyStarts(strip, strip, view)).toEqual([0]);
    expect(copyStarts(strip + 30, strip, view)).toEqual([-30]);
  });

  it('never has two copies of the text on the sign together', () => {
    for (let offset = 0; offset < strip; offset++) {
      const onSign = copyStarts(offset, strip, view).filter(start => start + text > 0 && start < view);
      expect(onSign.length).toBeLessThanOrEqual(1);
    }
  });
});
