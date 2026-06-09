// ============================================================================
//  Live KO scoring helpers. KO matches become startable once both teams are
//  resolved (bracket). best-of-sets matches keep a live SetScore[] (liveSets);
//  single-game KO matches (the bonus Americano) reuse the group liveScores flow.
// ============================================================================

import type { MatchResult } from '../types';
import type { ResolvedKoMatch } from './bracket';
import { timeToMinutes } from './schedule';

const byTimeCourt = (a: ResolvedKoMatch, b: ResolvedKoMatch) =>
  timeToMinutes(a.def.time) - timeToMinutes(b.def.time) || a.def.court - b.def.court;

const ready = (m: ResolvedKoMatch) => Boolean(m.homeTeam && m.awayTeam);

/** KO matches currently running (started, teams known, no final result yet). */
export function activeKoMatches(
  bracket: ResolvedKoMatch[],
  startedAt: Record<string, number>,
  results: Record<string, MatchResult>,
): ResolvedKoMatch[] {
  return bracket
    .filter((m) => ready(m) && startedAt[m.def.id] && !results[m.def.id])
    .sort(byTimeCourt);
}

/** The next KO match to start: earliest with both teams known, not started/done. */
export function nextKoMatch(
  bracket: ResolvedKoMatch[],
  startedAt: Record<string, number>,
  results: Record<string, MatchResult>,
): ResolvedKoMatch | null {
  return (
    bracket
      .filter((m) => ready(m) && !startedAt[m.def.id] && !results[m.def.id])
      .sort(byTimeCourt)[0] ?? null
  );
}

/** The next KO SLOT — all matches scheduled at the same time as the next match,
 *  i.e. the parallel courts that play simultaneously (QF wave, SF, bonus, F+P3). */
export function nextKoSlot(
  bracket: ResolvedKoMatch[],
  startedAt: Record<string, number>,
  results: Record<string, MatchResult>,
): ResolvedKoMatch[] {
  const next = nextKoMatch(bracket, startedAt, results);
  if (!next) return [];
  return bracket
    .filter(
      (m) =>
        ready(m) &&
        !startedAt[m.def.id] &&
        !results[m.def.id] &&
        m.def.time === next.def.time,
    )
    .sort(byTimeCourt);
}

/** All KO matches done (or none ready) → the tournament is over. */
export function koFinished(
  bracket: ResolvedKoMatch[],
  results: Record<string, MatchResult>,
): boolean {
  return bracket.length > 0 && bracket.every((m) => results[m.def.id]);
}
