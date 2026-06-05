// ============================================================================
//  Time-aware scheduling — binds the (already start-time-shifted) plan to the
//  real clock of the tournament day, so the UI can say "next slot in 12 min" or
//  flag a slot as OVERDUE when its planned time has passed but it hasn't started.
//
//  Nothing here starts a match automatically — it only derives *status* from the
//  current time. The admin always presses start manually.
// ============================================================================

import type { GroupMatchDef, MatchResult, Scenario } from '../types';
import { groupSlots } from './activeGames';

export type SlotTimeStatus = 'done' | 'live' | 'due' | 'upcoming';

export interface SlotTimeInfo {
  time: string; // shifted clock time, e.g. "10:00"
  epoch: number | null; // absolute ms of the planned start (null if no date set)
  matches: GroupMatchDef[];
  status: SlotTimeStatus;
}

/** Absolute epoch ms for a clock time ("11:10") on the tournament's calendar day. */
export function matchEpoch(tournamentDate: string | undefined, hhmm: string): number | null {
  if (!tournamentDate) return null;
  const datePart = tournamentDate.split('T')[0];
  if (!datePart) return null;
  const [y, mo, d] = datePart.split('-').map(Number);
  const [h, mi] = hhmm.split(':').map(Number);
  if ([y, mo, d, h, mi].some(Number.isNaN)) return null;
  return new Date(y, mo - 1, d, h, mi, 0, 0).getTime();
}

/** Status of a single slot given the clock. `due` = planned time reached but not started. */
export function slotStatus(
  epoch: number | null,
  anyStarted: boolean,
  allDone: boolean,
  now: number,
): SlotTimeStatus {
  if (allDone) return 'done';
  if (anyStarted) return 'live';
  if (epoch != null && now >= epoch) return 'due';
  return 'upcoming';
}

/** The whole group phase as time-annotated slots, in chronological order. */
export function slotTimeline(
  scenario: Scenario,
  tournamentDate: string | undefined,
  startedAt: Record<string, number>,
  results: Record<string, MatchResult>,
  now: number,
): SlotTimeInfo[] {
  return groupSlots(scenario).map((slot) => {
    const epoch = matchEpoch(tournamentDate, slot.time);
    const anyStarted = slot.matches.some((m) => startedAt[m.id]);
    const allDone = slot.matches.every((m) => results[m.id]);
    return {
      time: slot.time,
      epoch,
      matches: slot.matches,
      status: slotStatus(epoch, anyStarted, allDone, now),
    };
  });
}

/** First slot that still needs starting (not live, not done) — the "next up". */
export function nextActionSlot(timeline: SlotTimeInfo[]): SlotTimeInfo | null {
  return timeline.find((s) => s.status === 'due' || s.status === 'upcoming') ?? null;
}

/** Format a positive ms duration as a compact "1:04:09" / "4:09" / "0:09". */
export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}
