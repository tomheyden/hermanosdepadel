import { describe, expect, it } from 'vitest';
import { deriveScenario, getScenario } from './scenarios';

describe('deriveScenario time overrides', () => {
  it('keeps baseTime and applies a per-slot override', () => {
    const base = getScenario(1)!;
    const firstBase = base.groupSchedule[0].time; // e.g. "11:10"
    const derived = deriveScenario(1, undefined, undefined, { [firstBase]: '09:00' })!;

    const overridden = derived.groupSchedule.filter((m) => m.baseTime === firstBase);
    expect(overridden.length).toBeGreaterThan(0);
    for (const m of overridden) {
      expect(m.time).toBe('09:00'); // override wins
      expect(m.baseTime).toBe(firstBase); // stable key preserved
    }
    // a non-overridden slot keeps its (unshifted) base time
    const other = derived.groupSchedule.find((m) => m.baseTime !== firstBase)!;
    expect(other.time).toBe(other.baseTime);
  });

  it('shifts non-overridden slots by the chosen start time', () => {
    const base = getScenario(1)!;
    const firstBase = base.groupSchedule[0].time; // "11:10" baseline
    // start at 10:10 → everything shifts -60 min, except overridden slots
    const derived = deriveScenario(1, '2026-07-05T10:10', undefined, undefined)!;
    const first = derived.groupSchedule.find((m) => m.baseTime === firstBase)!;
    expect(first.time).toBe('10:10');
  });
});
