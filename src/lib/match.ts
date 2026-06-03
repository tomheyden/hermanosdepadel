// ============================================================================
//  Match evaluation — turn a stored MatchResult + its format into a verdict.
//
//  Used by both the group standings (single-game point scores) and the KO
//  bracket (sets / match tie-break). Pure and side-effect free.
// ============================================================================

import type { MatchFormat, MatchResult } from '../types';

export interface MatchOutcome {
  /** true once the result is fully decided per the format. */
  complete: boolean;
  /** 'home' | 'away' | null (null = not decided / draw). */
  winner: 'home' | 'away' | null;
  homeSetsWon: number;
  awaySetsWon: number;
  /** total points (games) — used by group ranking. */
  homePoints: number;
  awayPoints: number;
}

const EMPTY: MatchOutcome = {
  complete: false,
  winner: null,
  homeSetsWon: 0,
  awaySetsWon: 0,
  homePoints: 0,
  awayPoints: 0,
};

/**
 * Evaluate a result. For single-game formats (americano / shortSet) the winner
 * is simply whoever scored more in the one game. For bestOfSets we count sets
 * won (a set goes to whoever has more games; the optional 3rd set may be a
 * match tie-break) and need a majority of `sets`.
 */
export function evaluateMatch(
  result: MatchResult | undefined,
  format: MatchFormat,
): MatchOutcome {
  if (!result || result.sets.length === 0) return EMPTY;

  const homePoints = result.sets.reduce((s, set) => s + set.home, 0);
  const awayPoints = result.sets.reduce((s, set) => s + set.away, 0);

  if (format.type === 'americano' || format.type === 'shortSet') {
    const set = result.sets[0];
    const decided = set.home !== set.away;
    return {
      complete: decided,
      winner: decided ? (set.home > set.away ? 'home' : 'away') : null,
      homeSetsWon: decided && set.home > set.away ? 1 : 0,
      awaySetsWon: decided && set.away > set.home ? 1 : 0,
      homePoints,
      awayPoints,
    };
  }

  // bestOfSets: count sets won.
  const setsToWin = Math.ceil((format.sets ?? 3) / 2); // best of 3 → 2
  let homeSetsWon = 0;
  let awaySetsWon = 0;
  for (const set of result.sets) {
    if (set.home > set.away) homeSetsWon++;
    else if (set.away > set.home) awaySetsWon++;
  }

  const winner =
    homeSetsWon >= setsToWin ? 'home' : awaySetsWon >= setsToWin ? 'away' : null;

  return {
    complete: winner !== null,
    winner,
    homeSetsWon,
    awaySetsWon,
    homePoints,
    awayPoints,
  };
}
