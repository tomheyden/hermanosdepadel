// ============================================================================
//  Tennis-style KO scoring (pure helpers).
//
//  A KO match = best-of-3 SETS. Each set = best-of-3 GAMES (first to 2, so a set
//  ends 2:0 or 2:1 — never a draw). Each game is scored like tennis: 0 / 15 / 30
//  / 40, and at 40:40 a single Golden Point decides it (no advantage).
//
//  Persisted live state:
//    • liveSets[id]: SetScore[]  — games per set (completed + the current set)
//    • liveGame[id]: SetScore    — points of the current game (0..3 each)
//  The final result stores only the games per set (SetScore[]).
// ============================================================================

import type { SetScore } from '../types';

const GAMES_TO_WIN_SET = 2; // best-of-3 games
const SETS_TO_WIN_MATCH = 2; // best-of-3 sets

/** Tennis point label for a 0..3 count. */
export function pointLabel(p: number): string {
  return ['0', '15', '30', '40'][Math.min(p, 3)] ?? '40';
}

/** Sets won so far — a set is won by the side that reached 2 games. */
export function setWinsOf(sets: SetScore[]): { home: number; away: number } {
  let home = 0;
  let away = 0;
  for (const s of sets) {
    if (s.home >= GAMES_TO_WIN_SET) home++;
    else if (s.away >= GAMES_TO_WIN_SET) away++;
  }
  return { home, away };
}

/** Match winner once a side has 2 sets, else null. */
export function koWinner(sets: SetScore[]): 'home' | 'away' | null {
  const w = setWinsOf(sets);
  if (w.home >= SETS_TO_WIN_MATCH) return 'home';
  if (w.away >= SETS_TO_WIN_MATCH) return 'away';
  return null;
}

/** True at 40:40 — the next point (Golden Point) wins the game. */
export function isGoldenPoint(game: SetScore): boolean {
  return game.home >= 3 && game.away >= 3;
}

/**
 * Apply a won point to a side and cascade game → set → match.
 * Returns the next { sets, game } state. (Pure — caller persists it.)
 */
export function awardPoint(
  sets: SetScore[],
  game: SetScore,
  side: 'home' | 'away',
): { sets: SetScore[]; game: SetScore } {
  // not yet game point → just advance the points (0→15→30→40)
  if (game[side] < 3) {
    return { sets, game: { ...game, [side]: game[side] + 1 } };
  }

  // game point (at 40, incl. Golden Point at 40:40) → win the game
  const nextSets = sets.map((s) => ({ ...s }));
  const last = nextSets.length - 1;
  nextSets[last][side] += 1;

  // set won? (first to 2 games) → start the next set unless the match is decided
  if (nextSets[last][side] >= GAMES_TO_WIN_SET && !koWinner(nextSets)) {
    nextSets.push({ home: 0, away: 0 });
  }
  return { sets: nextSets, game: { home: 0, away: 0 } };
}
