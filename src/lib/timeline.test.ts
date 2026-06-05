import { describe, expect, it } from 'vitest';
import { matchEpoch, slotStatus, formatRemaining } from './timeline';

describe('matchEpoch', () => {
  it('combines the tournament day with a clock time', () => {
    const ms = matchEpoch('2026-07-05T10:00', '11:10')!;
    const d = new Date(ms);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6); // July (0-based)
    expect(d.getDate()).toBe(5);
    expect(d.getHours()).toBe(11);
    expect(d.getMinutes()).toBe(10);
  });

  it('returns null without a date', () => {
    expect(matchEpoch(undefined, '11:10')).toBeNull();
  });
});

describe('slotStatus', () => {
  const epoch = matchEpoch('2026-07-05T11:10', '11:10')!;

  it('is done when all matches finished', () => {
    expect(slotStatus(epoch, false, true, epoch + 999_999)).toBe('done');
  });
  it('is live when started and not done', () => {
    expect(slotStatus(epoch, true, false, epoch)).toBe('live');
  });
  it('is upcoming before its planned time', () => {
    expect(slotStatus(epoch, false, false, epoch - 60_000)).toBe('upcoming');
  });
  it('is due once the planned time has passed and nothing started', () => {
    expect(slotStatus(epoch, false, false, epoch + 60_000)).toBe('due');
  });
});

describe('formatRemaining', () => {
  it('drops the hour segment under an hour', () => {
    expect(formatRemaining(9 * 1000)).toBe('0:09');
    expect(formatRemaining((4 * 60 + 9) * 1000)).toBe('4:09');
  });
  it('shows hours when present', () => {
    expect(formatRemaining((1 * 3600 + 4 * 60 + 9) * 1000)).toBe('1:04:09');
  });
});
