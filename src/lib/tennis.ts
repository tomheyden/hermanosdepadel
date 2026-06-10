// ============================================================================
//  Tennis-style KO scoring (pure helpers).
//
//  A KO match = best-of-3 SETS:
//    • Sets 1 & 2: first to `setTarget` games (e.g. 4 → also 4:3). Each GAME is
//      scored like tennis (0/15/30/40), Golden Point at 40:40.
//    • At 1:1 sets the 3rd set is a MATCH TIE-BREAK: plain points, first to
//      `tieBreakTarget` (e.g. 7) — no 15/30/40 there.
//
//  Persisted live state:
//    • liveSets[id]: SetScore[]  — games per set (and the tie-break's points)
//    • liveGame[id]: SetScore    — current game's points (0..3), unused in the TB
//  The final result stores only the games per set (SetScore[]).
// ============================================================================

import type { MatchFormat, SetScore } from '../types';

/** Tennis point label for a 0..3 count. */
export function pointLabel(p: number): string {
  return ['0', '15', '30', '40'][Math.min(p, 3)] ?? '40';
}

/** Games/points needed to win set index `i` of a format. */
function setTargetFor(format: MatchFormat, i: number): number {
  const base = format.setTarget ?? 4;
  if (format.type === 'bestOfSets' && format.tieBreakTarget && i === 2) return format.tieBreakTarget;
  return base;
}

/** The 3rd set is the match tie-break (only reached at 1:1). */
export function isTieBreakSet(sets: SetScore[], format: MatchFormat): boolean {
  return Boolean(format.type === 'bestOfSets' && format.tieBreakTarget && sets.length === 3);
}

/** Sets won so far — a set is won once a side reaches its target. */
export function setWinsOf(sets: SetScore[], format: MatchFormat): { home: number; away: number } {
  let home = 0;
  let away = 0;
  sets.forEach((s, i) => {
    const target = setTargetFor(format, i);
    if (s.home >= target) home++;
    else if (s.away >= target) away++;
  });
  return { home, away };
}

/** Match winner once a side has the majority of sets, else null. */
export function koWinner(sets: SetScore[], format: MatchFormat): 'home' | 'away' | null {
  const setsToWin = Math.ceil((format.sets ?? 3) / 2);
  const w = setWinsOf(sets, format);
  if (w.home >= setsToWin) return 'home';
  if (w.away >= setsToWin) return 'away';
  return null;
}

/** True at 40:40 in a normal game — the next point (Golden Point) wins it. */
export function isGoldenPoint(game: SetScore): boolean {
  return game.home >= 3 && game.away >= 3;
}

/**
 * Apply a won point to a side. In the tie-break it's a plain point; otherwise it
 * advances the tennis game (0→15→30→40→game) and cascades game → set.
 */
export function awardPoint(
  sets: SetScore[],
  game: SetScore,
  side: 'home' | 'away',
  format: MatchFormat,
): { sets: SetScore[]; game: SetScore } {
  const last = sets.length - 1;

  // ── Tie-break: plain points, first to tieBreakTarget ──────────────────────
  if (isTieBreakSet(sets, format)) {
    const nextSets = sets.map((s) => ({ ...s }));
    nextSets[last][side] += 1;
    return { sets: nextSets, game: { home: 0, away: 0 } };
  }

  // ── Normal set: tennis game (0/15/30/40, Golden Point at 40:40) ────────────
  if (game[side] < 3) {
    return { sets, game: { ...game, [side]: game[side] + 1 } };
  }

  // game point won → add a game; if the set is now won, open the next set
  const nextSets = sets.map((s) => ({ ...s }));
  nextSets[last][side] += 1;
  if (nextSets[last][side] >= setTargetFor(format, last) && !koWinner(nextSets, format)) {
    nextSets.push({ home: 0, away: 0 });
  }
  return { sets: nextSets, game: { home: 0, away: 0 } };
}
