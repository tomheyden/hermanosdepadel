// ============================================================================
//  Group standings (Americano).
//
//  Ranking criteria — confirmed with the organiser, applied in this order:
//    1. Gewonnene Spiele (match wins)         → matchPoints (2 per win, 1 draw)
//    2. Punktedifferenz gesamt (pointsFor − pointsAgainst, over ALL matches)
//    3. Erzielte Punkte gesamt (pointsFor)
//    4. Stable fallback (team id) so the order is deterministic.
//
//  Note: per the organiser there is NO head-to-head/mini-table step — ties are
//  broken purely by total difference, then total points scored.
// ============================================================================

import type { GroupDef, MatchResult, Scenario, SlotId, Standing, Team } from '../types';
import { evaluateMatch } from './match';

/** Compute the live standings for one group. */
export function computeGroupStandings(
  scenario: Scenario,
  group: GroupDef,
  teams: Record<SlotId, Team>,
  results: Record<string, MatchResult>,
): Standing[] {
  // Seed a row for every slot in the group.
  const rows = new Map<SlotId, Standing>();
  for (const slot of group.slots) {
    rows.set(slot, {
      teamId: slot,
      rank: 0,
      played: 0,
      won: 0,
      lost: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      diff: 0,
      matchPoints: 0,
    });
  }

  // Fold in every completed group match of this group.
  const matches = scenario.groupSchedule.filter((m) => m.group === group.id);
  for (const match of matches) {
    const outcome = evaluateMatch(results[match.id], match.format);
    if (!outcome.complete) continue;

    const home = rows.get(match.home);
    const away = rows.get(match.away);
    if (!home || !away) continue;

    home.played++;
    away.played++;
    home.pointsFor += outcome.homePoints;
    home.pointsAgainst += outcome.awayPoints;
    away.pointsFor += outcome.awayPoints;
    away.pointsAgainst += outcome.homePoints;

    if (outcome.winner === 'home') {
      home.won++;
      home.matchPoints += 2;
      away.lost++;
    } else if (outcome.winner === 'away') {
      away.won++;
      away.matchPoints += 2;
      home.lost++;
    } else {
      // draw (rare with golden point, but handle defensively)
      home.matchPoints += 1;
      away.matchPoints += 1;
    }
  }

  // Finalise diff and sort.
  const standings = [...rows.values()];
  for (const s of standings) s.diff = s.pointsFor - s.pointsAgainst;

  standings.sort(compareStandings);
  standings.forEach((s, i) => (s.rank = i + 1));
  // void teams param kept for signature symmetry / future name-based tiebreaks
  void teams;
  return standings;
}

/** The ranking comparator (returns <0 if a ranks ABOVE b). */
export function compareStandings(a: Standing, b: Standing): number {
  if (b.matchPoints !== a.matchPoints) return b.matchPoints - a.matchPoints; // 1. wins
  if (b.diff !== a.diff) return b.diff - a.diff; // 2. total difference
  if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor; // 3. total points
  return a.teamId.localeCompare(b.teamId); // 4. deterministic fallback
}

/** True when every group match in the scenario has a completed result. */
export function isGroupPhaseComplete(
  scenario: Scenario,
  results: Record<string, MatchResult>,
): boolean {
  return scenario.groupSchedule.every((m) => evaluateMatch(results[m.id], m.format).complete);
}

/** Convenience: standings for every group, keyed by group id. */
export function computeAllStandings(
  scenario: Scenario,
  teams: Record<SlotId, Team>,
  results: Record<string, MatchResult>,
): Record<string, Standing[]> {
  const out: Record<string, Standing[]> = {};
  for (const group of scenario.groups) {
    out[group.id] = computeGroupStandings(scenario, group, teams, results);
  }
  return out;
}
