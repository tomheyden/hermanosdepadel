// ============================================================================
//  Helpers for the "active games" flow (group phase / Americano).
//  An active match = started (timer running) and not yet finalised into results.
// ============================================================================

import type { GroupMatchDef, MatchResult, Scenario } from '../types';
import { timeToMinutes } from './schedule';

export function activeGroupMatches(
  scenario: Scenario,
  startedAt: Record<string, number>,
  results: Record<string, MatchResult>,
): GroupMatchDef[] {
  return scenario.groupSchedule
    .filter((m) => startedAt[m.id] && !results[m.id])
    .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time) || a.court - b.court);
}

/** Group the plan by time slot (both courts play together). */
export function groupSlots(scenario: Scenario): Array<{ time: string; matches: GroupMatchDef[] }> {
  const byTime = new Map<string, GroupMatchDef[]>();
  for (const m of scenario.groupSchedule) {
    if (!byTime.has(m.time)) byTime.set(m.time, []);
    byTime.get(m.time)!.push(m);
  }
  return [...byTime.entries()].map(([time, matches]) => ({
    time,
    matches: matches.sort((a, b) => a.court - b.court),
  }));
}

/** Earliest slot that isn't started yet and isn't fully finished. */
export function nextStartableSlot(
  scenario: Scenario,
  startedAt: Record<string, number>,
  results: Record<string, MatchResult>,
): { time: string; matches: GroupMatchDef[] } | null {
  for (const slot of groupSlots(scenario)) {
    const anyStarted = slot.matches.some((m) => startedAt[m.id]);
    const allDone = slot.matches.every((m) => results[m.id]);
    if (!anyStarted && !allDone) return slot;
  }
  return null;
}
