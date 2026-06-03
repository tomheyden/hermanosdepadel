// ============================================================================
//  Qualification — who advances to the KO, and in which seed slot.
//
//  Confirmed rules:
//   • Take the top `topPerGroup` of every group, plus (optionally) the best
//     `bestRunnersUp` teams that finished at `bestRunnersUpRank` across groups.
//   • Seeding is "über-Kreuz": group winners are PROTECTED on the strong seeds,
//     and a winner faces a runner-up from a DIFFERENT group in the first KO
//     round wherever possible (best-effort same-group avoidance via swaps).
//
//  Output: a `seeds` array where seeds[i] is the team id for seed number i+1.
//  The KO bracket in scenarios.ts references { type: 'seed', seed: n } and is
//  filled from this array.
// ============================================================================

import type { MatchResult, Scenario, SlotId, Standing, Team } from '../types';
import { computeAllStandings, isGroupPhaseComplete, compareStandings } from './standings';

export interface Qualifier {
  teamId: SlotId;
  group: string;
  groupRank: number; // 1 = winner, 2 = runner-up, 3 = third
  standing: Standing;
}

export interface QualificationResult {
  /** seeds[i] === team id for seed (i+1); '' if no team yet. */
  seeds: SlotId[];
  qualifiers: Qualifier[]; // in seed order
  /** true once the whole group phase is decided (qualifiers are final). */
  complete: boolean;
}

/** Standard first-round pairings (low seed = stronger, top of its pair). */
function bracketPairs(n: number): Array<[number, number]> {
  if (n === 4) return [[1, 4], [2, 3]];
  if (n === 8)
    return [
      [1, 8],
      [4, 5],
      [3, 6],
      [2, 7],
    ];
  throw new Error(`Unsupported KO size: ${n}`);
}

export function computeQualification(
  scenario: Scenario,
  teams: Record<SlotId, Team>,
  results: Record<string, MatchResult>,
): QualificationResult {
  const allStandings = computeAllStandings(scenario, teams, results);
  const { topPerGroup, bestRunnersUp, bestRunnersUpRank, qualifierCount } =
    scenario.qualification;

  // 1. Direct qualifiers: top N of every group.
  const direct: Qualifier[] = [];
  for (const group of scenario.groups) {
    const standings = allStandings[group.id];
    for (let i = 0; i < topPerGroup && i < standings.length; i++) {
      direct.push({
        teamId: standings[i].teamId,
        group: group.id,
        groupRank: i + 1,
        standing: standings[i],
      });
    }
  }

  // 2. Wildcards: best teams at `bestRunnersUpRank` across all groups.
  const wildcards: Qualifier[] = [];
  if (bestRunnersUp && bestRunnersUpRank) {
    const candidates: Qualifier[] = [];
    for (const group of scenario.groups) {
      const s = allStandings[group.id][bestRunnersUpRank - 1];
      if (s) candidates.push({ teamId: s.teamId, group: group.id, groupRank: bestRunnersUpRank, standing: s });
    }
    candidates.sort((a, b) => compareStandings(a.standing, b.standing));
    wildcards.push(...candidates.slice(0, bestRunnersUp));
  }

  // 3. Seed-priority order: winners first (by strength), then the rest
  //    (runners-up, then wildcards) by strength. Assigning this order to seeds
  //    1..N puts winners on the protected top-of-pair seeds.
  const ordered = [...direct, ...wildcards].sort((a, b) => {
    if (a.groupRank !== b.groupRank) return a.groupRank - b.groupRank;
    return compareStandings(a.standing, b.standing);
  });

  const bySeed = ordered.slice(0, qualifierCount); // index i → seed i+1

  // 4. Best-effort same-group avoidance: swap runner-up (partner) seeds so a
  //    winner doesn't meet a team from its own group in the first KO round.
  if (bySeed.length === qualifierCount) {
    avoidSameGroupFirstRound(bySeed, bracketPairs(qualifierCount));
  }

  return {
    seeds: bySeed.map((q) => q.teamId),
    qualifiers: bySeed,
    complete: isGroupPhaseComplete(scenario, results),
  };
}

/**
 * Swaps the "partner" (higher-numbered) seed of any pair whose two teams share
 * a group, with another partner seed, when that removes the clash without
 * creating a new one. Winners on the low seeds stay put (protected).
 */
function avoidSameGroupFirstRound(bySeed: Qualifier[], pairs: Array<[number, number]>) {
  const at = (seed: number) => bySeed[seed - 1];
  const sameGroup = (s1: number, s2: number) => at(s1).group === at(s2).group;

  for (const [low, high] of pairs) {
    if (!sameGroup(low, high)) continue;
    for (const [low2, high2] of pairs) {
      if (high2 === high) continue;
      // swapping the two partner teams must resolve THIS clash and not break the other pair
      if (at(low).group !== at(high2).group && at(low2).group !== at(high).group) {
        const tmp = bySeed[high - 1];
        bySeed[high - 1] = bySeed[high2 - 1];
        bySeed[high2 - 1] = tmp;
        break;
      }
    }
  }
}
