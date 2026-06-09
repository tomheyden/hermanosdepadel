// ============================================================================
//  KO bracket resolution.
//
//  Resolves each KO match's two SlotRefs into concrete team ids:
//    • seed   → the qualifier seeding (from qualification.ts)
//    • winner → the winner of an earlier KO match
//    • loser  → the loser of an earlier KO match (feeds the 3rd-place match)
//  Winners advance automatically as results are entered. Also derives the final
//  ranking (places 1–4) once the final and the 3rd-place match are complete.
// ============================================================================

import type { KoMatchDef, KoStage, MatchResult, Scenario, SlotId, SlotRef } from '../types';
import { evaluateMatch, type MatchOutcome } from './match';

export interface ResolvedKoMatch {
  def: KoMatchDef;
  homeTeam: SlotId | null;
  awayTeam: SlotId | null;
  outcome: MatchOutcome;
  winnerTeam: SlotId | null;
  loserTeam: SlotId | null;
}

// Resolve KO matches in stage order so winner/loser refs always point backwards.
// BONUS only depends on `eliminated` (group-derived), so its order is irrelevant.
const STAGE_ORDER: Record<KoStage, number> = { QF: 0, SF: 1, BONUS: 1, F: 2, P3: 2 };

export function resolveBracket(
  scenario: Scenario,
  seeds: SlotId[],
  results: Record<string, MatchResult>,
  eliminated: SlotId[] = [],
): ResolvedKoMatch[] {
  const resolved = new Map<string, ResolvedKoMatch>();

  const resolveRef = (ref: SlotRef): SlotId | null => {
    switch (ref.type) {
      case 'seed':
        return seeds[ref.seed - 1] ?? null;
      case 'winner':
        return resolved.get(ref.matchId)?.winnerTeam ?? null;
      case 'loser':
        return resolved.get(ref.matchId)?.loserTeam ?? null;
      case 'eliminated':
        return eliminated[ref.rank - 1] ?? null;
    }
  };

  const order = [...scenario.koSchedule].sort(
    (a, b) => STAGE_ORDER[a.stage] - STAGE_ORDER[b.stage],
  );

  for (const def of order) {
    const homeTeam = resolveRef(def.home);
    const awayTeam = resolveRef(def.away);
    const outcome = evaluateMatch(results[def.id], def.format);

    let winnerTeam: SlotId | null = null;
    let loserTeam: SlotId | null = null;
    if (outcome.winner === 'home') {
      winnerTeam = homeTeam;
      loserTeam = awayTeam;
    } else if (outcome.winner === 'away') {
      winnerTeam = awayTeam;
      loserTeam = homeTeam;
    }

    resolved.set(def.id, { def, homeTeam, awayTeam, outcome, winnerTeam, loserTeam });
  }

  // Return in the scenario's original (chronological) order for display.
  return scenario.koSchedule.map((def) => resolved.get(def.id)!);
}

export interface FinalStanding {
  place: number; // 1..4
  teamId: SlotId;
}

/**
 * Places 1–4, available once the final (F) and 3rd-place match (P3) are
 * complete. 1st/2nd from the final, 3rd/4th from the 3rd-place match.
 */
export function computeFinalStandings(bracket: ResolvedKoMatch[]): FinalStanding[] | null {
  const final = bracket.find((m) => m.def.stage === 'F');
  const third = bracket.find((m) => m.def.stage === 'P3');
  if (!final?.outcome.complete || !third?.outcome.complete) return null;

  const places: FinalStanding[] = [];
  if (final.winnerTeam) places.push({ place: 1, teamId: final.winnerTeam });
  if (final.loserTeam) places.push({ place: 2, teamId: final.loserTeam });
  if (third.winnerTeam) places.push({ place: 3, teamId: third.winnerTeam });
  if (third.loserTeam) places.push({ place: 4, teamId: third.loserTeam });
  return places;
}

export interface BonusResult {
  /** the 4 bonus teams ranked into places 5–8 (places[3] is the worst team). */
  places: Array<{ place: number; teamId: SlotId }>;
  /** the very last team — "Worst Team of the Tournament". */
  worstTeamId: SlotId | null;
}

/**
 * Resolve the bonus round (the 4 group-phase non-qualifiers). Once both bonus
 * matches are decided, the two winners take 5th/6th and the two losers 7th/8th —
 * ordered within each pair by the eliminated ranking (best first). The last is
 * the worst team. `eliminated` must be the best→worst non-qualifier ranking.
 */
export function computeBonusStandings(
  bracket: ResolvedKoMatch[],
  eliminated: SlotId[],
): BonusResult | null {
  const bonus = bracket.filter((m) => m.def.stage === 'BONUS');
  if (bonus.length === 0 || !bonus.every((m) => m.outcome.complete)) return null;

  const rank = (id: SlotId | null) => (id ? eliminated.indexOf(id) : Infinity);
  const byRank = (a: SlotId | null, b: SlotId | null) => rank(a) - rank(b);

  const winners = bonus.map((m) => m.winnerTeam).filter(Boolean).sort(byRank) as SlotId[];
  const losers = bonus.map((m) => m.loserTeam).filter(Boolean).sort(byRank) as SlotId[];

  const ordered = [...winners, ...losers]; // 5th, 6th, 7th, 8th
  const places = ordered.map((teamId, i) => ({ place: 5 + i, teamId }));
  return { places, worstTeamId: ordered[ordered.length - 1] ?? null };
}
