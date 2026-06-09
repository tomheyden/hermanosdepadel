// ============================================================================
//  Qualification — who advances to the KO, and in which seed slot.
//
//  Confirmed rules:
//   • Take the top `topPerGroup` of every group, plus (optionally) the best
//     `bestRunnersUp` teams that finished at `bestRunnersUpRank` across groups.
//   • Seeding is PURE PERFORMANCE: every qualifier is ranked globally by
//     (1) wins, then (2) points scored. The bracket then pairs best vs worst
//     (seed 1 v seed N, 2 v N-1, …). No group-winner protection, no same-group
//     avoidance — strictly "der Beste gegen den Schlechtesten".
//
//  Output: a `seeds` array where seeds[i] is the team id for seed number i+1,
//  plus `eliminated` — the group-phase non-qualifiers ranked best→worst (they
//  feed the bonus round).
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
  /** group-phase non-qualifiers, ranked best→worst (eliminated[0] is the best). */
  eliminated: SlotId[];
  /** true once the whole group phase is decided (qualifiers are final). */
  complete: boolean;
}

/**
 * KO ranking comparator: (1) wins, then (2) points scored. Difference and a
 * stable id are only deep tie-breakers. Used to seed the bracket and to rank
 * the eliminated teams for the bonus round.
 */
export function compareByPerformance(a: Standing, b: Standing): number {
  if (b.matchPoints !== a.matchPoints) return b.matchPoints - a.matchPoints; // 1. wins
  if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor; // 2. points scored
  if (b.diff !== a.diff) return b.diff - a.diff; // deep tie-break: difference
  return a.teamId.localeCompare(b.teamId); // deterministic fallback
}

/**
 * Placeholder label for a KO seed slot, shown until the group phase is decided.
 * Seeding is pure performance now, so the honest label is just the seed rank.
 */
export function seedLabel(_scenario: Scenario, seed: number): string {
  return `Setzplatz ${seed}`;
}

/** Placeholder label for a bonus-round slot (Nth-best eliminated team). */
export function eliminatedLabel(rank: number, total = 4): string {
  if (rank === 1) return 'Bester Ausgeschiedener';
  if (rank === total) return 'Schlechtester';
  return `${rank}.-bester Ausgeschiedener`;
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

  // 3. Pure-performance seed order: rank ALL qualifiers globally by wins → points.
  //    Seed 1 = strongest. The bracket pairs seed i with seed (N+1−i), i.e. the
  //    best plays the worst — regardless of group rank.
  const ordered = [...direct, ...wildcards].sort((a, b) =>
    compareByPerformance(a.standing, b.standing),
  );
  const bySeed = ordered.slice(0, qualifierCount); // index i → seed i+1
  const qualifiedIds = new Set(bySeed.map((q) => q.teamId));

  // 4. The non-qualifiers, ranked best→worst (same criteria) — they feed the
  //    bonus round (best vs worst), and the very last is the "worst team".
  const eliminated: Standing[] = [];
  for (const group of scenario.groups) {
    for (const s of allStandings[group.id]) {
      if (!qualifiedIds.has(s.teamId)) eliminated.push(s);
    }
  }
  eliminated.sort(compareByPerformance);

  return {
    seeds: bySeed.map((q) => q.teamId),
    qualifiers: bySeed,
    eliminated: eliminated.map((s) => s.teamId),
    complete: isGroupPhaseComplete(scenario, results),
  };
}
