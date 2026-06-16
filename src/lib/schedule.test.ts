import { describe, expect, it } from 'vitest';
import { addMinutes, buildGroupSchedule, roundRobinRounds } from './schedule';
import type { GroupDef, MatchFormat } from '../types';

const AMERICANO: MatchFormat = { type: 'americano', goldenPoint: true };

describe('time helpers', () => {
  it('adds minutes across the hour', () => {
    expect(addMinutes('11:10', 13)).toBe('11:23');
    expect(addMinutes('11:49', 13)).toBe('12:02');
  });
});

describe('roundRobinRounds (circle method)', () => {
  it('produces the classic 4-player rotation used by the brief', () => {
    const rounds = roundRobinRounds([1, 2, 3, 4]);
    expect(rounds.flat()).toEqual([
      [1, 4],
      [2, 3],
      [1, 3],
      [4, 2],
      [1, 2],
      [3, 4],
    ]);
  });

  it('handles odd group sizes with a bye (3 matches for 3 teams)', () => {
    const rounds = roundRobinRounds([1, 2, 3]);
    expect(rounds.flat()).toHaveLength(3);
  });
});

describe('buildGroupSchedule — must reproduce the hand-given Scenario 1 plan', () => {
  const groups: GroupDef[] = [1, 2, 3, 4].map((n) => ({
    id: `G${n}`,
    label: `Gruppe ${n}`,
    slots: [`G${n}.1`, `G${n}.2`, `G${n}.3`, `G${n}.4`],
  }));

  const schedule = buildGroupSchedule(groups, '11:10', 10, AMERICANO, 3);

  // The exact reference plan from the brief: [time, court, home, away]
  const expected: Array<[string, 1 | 2, string, string]> = [
    ['11:10', 1, 'G1.1', 'G1.4'],
    ['11:10', 2, 'G2.1', 'G2.4'],
    ['11:23', 1, 'G3.1', 'G3.4'],
    ['11:23', 2, 'G4.1', 'G4.4'],
    ['11:36', 1, 'G1.2', 'G1.3'],
    ['11:36', 2, 'G2.2', 'G2.3'],
    ['11:49', 1, 'G3.2', 'G3.3'],
    ['11:49', 2, 'G4.2', 'G4.3'],
    ['12:02', 1, 'G1.1', 'G1.3'],
    ['12:02', 2, 'G2.1', 'G2.3'],
    ['12:15', 1, 'G3.1', 'G3.3'],
    ['12:15', 2, 'G4.1', 'G4.3'],
    ['12:28', 1, 'G1.4', 'G1.2'],
    ['12:28', 2, 'G2.4', 'G2.2'],
    ['12:41', 1, 'G3.4', 'G3.2'],
    ['12:41', 2, 'G4.4', 'G4.2'],
    ['12:54', 1, 'G1.1', 'G1.2'],
    ['12:54', 2, 'G2.1', 'G2.2'],
    ['13:07', 1, 'G3.1', 'G3.2'],
    ['13:07', 2, 'G4.1', 'G4.2'],
    ['13:20', 1, 'G1.3', 'G1.4'],
    ['13:20', 2, 'G2.3', 'G2.4'],
    ['13:33', 1, 'G3.3', 'G3.4'],
    ['13:33', 2, 'G4.3', 'G4.4'],
  ];

  it('matches every slot, court and pairing', () => {
    const actual = schedule.map((m) => [m.time, m.court, m.home, m.away]);
    expect(actual).toEqual(expected);
  });
});

describe('buildGroupSchedule — Scenario 6 Variant B (3×4, group order G1·G3·G2 / G1·G2·G3)', () => {
  const groups: GroupDef[] = [1, 2, 3].map((n) => ({
    id: `G${n}`,
    label: `Gruppe ${n}`,
    slots: [`G${n}.1`, `G${n}.2`, `G${n}.3`, `G${n}.4`],
  }));
  const order = ['G1', 'G3', 'G2', 'G1', 'G2', 'G3', 'G1', 'G2', 'G3'];
  const schedule = buildGroupSchedule(groups, '11:10', 11, AMERICANO, 3, order);

  // One full group round per slot (both courts), in the configured order.
  const expected: Array<[string, 1 | 2, string, string]> = [
    ['11:10', 1, 'G1.1', 'G1.4'],
    ['11:10', 2, 'G1.2', 'G1.3'],
    ['11:24', 1, 'G3.1', 'G3.4'],
    ['11:24', 2, 'G3.2', 'G3.3'],
    ['11:38', 1, 'G2.1', 'G2.4'],
    ['11:38', 2, 'G2.2', 'G2.3'],
    ['11:52', 1, 'G1.1', 'G1.3'],
    ['11:52', 2, 'G1.4', 'G1.2'],
    ['12:06', 1, 'G2.1', 'G2.3'],
    ['12:06', 2, 'G2.4', 'G2.2'],
    ['12:20', 1, 'G3.1', 'G3.3'],
    ['12:20', 2, 'G3.4', 'G3.2'],
    ['12:34', 1, 'G1.1', 'G1.2'],
    ['12:34', 2, 'G1.3', 'G1.4'],
    ['12:48', 1, 'G2.1', 'G2.2'],
    ['12:48', 2, 'G2.3', 'G2.4'],
    ['13:02', 1, 'G3.1', 'G3.2'],
    ['13:02', 2, 'G3.3', 'G3.4'],
  ];

  it('matches every slot, court and pairing', () => {
    const actual = schedule.map((m) => [m.time, m.court, m.home, m.away]);
    expect(actual).toEqual(expected);
  });

  it('no team plays in two consecutive time slots (no back-to-back)', () => {
    const times = [...new Set(schedule.map((m) => m.time))].sort();
    const teamsAt = (t: string) =>
      new Set(schedule.filter((m) => m.time === t).flatMap((m) => [m.home, m.away]));
    for (let i = 1; i < times.length; i++) {
      const prev = teamsAt(times[i - 1]);
      const overlap = [...teamsAt(times[i])].filter((id) => prev.has(id));
      expect(overlap).toEqual([]);
    }
  });
});
