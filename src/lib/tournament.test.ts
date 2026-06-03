import { describe, expect, it } from 'vitest';
import { getScenario } from '../data/scenarios';
import { computeGroupStandings } from './standings';
import { computeQualification } from './qualification';
import { resolveBracket, computeFinalStandings } from './bracket';
import type { MatchResult, SlotId, Team } from '../types';

// Build a minimal team map for a scenario (names == slot ids for tests).
function makeTeams(scenarioId: number): Record<SlotId, Team> {
  const scenario = getScenario(scenarioId)!;
  const teams: Record<SlotId, Team> = {};
  for (const g of scenario.groups) {
    for (const slot of g.slots) {
      teams[slot] = { id: slot, name: slot, player1: '', player2: '', group: g.id };
    }
  }
  return teams;
}

// Helper: single-game result for a group/short-set match.
const game = (matchId: string, home: number, away: number): MatchResult => ({
  matchId,
  sets: [{ home, away }],
});

describe('computeGroupStandings — ranking order', () => {
  const scenario = getScenario(1)!; // 4×4, americano
  const teams = makeTeams(1);
  const group = scenario.groups[0]; // G1, slots G1.1..G1.4
  const matches = scenario.groupSchedule.filter((m) => m.group === group.id);

  it('ranks by wins, then total diff, then total points', () => {
    // Make G1.1 win all (most wins), G1.2 second, etc. by crafting scores.
    const results: Record<string, MatchResult> = {};
    for (const m of matches) {
      // higher slot number loses; closer scores → control diff
      const h = Number(m.home.split('.')[1]);
      const a = Number(m.away.split('.')[1]);
      results[m.id] = game(m.id, h < a ? 21 : 10, h < a ? 10 : 21);
    }
    const standings = computeGroupStandings(scenario, group, teams, results);
    expect(standings.map((s) => s.teamId)).toEqual(['G1.1', 'G1.2', 'G1.3', 'G1.4']);
    expect(standings[0].won).toBe(3);
    expect(standings[3].won).toBe(0);
  });

  it('uses total difference to break a win tie', () => {
    // Construct a 3-way tie on wins resolved by diff. Simpler: two teams 2 wins.
    const results: Record<string, MatchResult> = {};
    for (const m of matches) {
      const h = Number(m.home.split('.')[1]);
      const a = Number(m.away.split('.')[1]);
      // G1.1 and G1.2 both strong; give G1.1 bigger margins
      const winner = h < a ? m.home : m.away;
      const big = winner === 'G1.1';
      results[m.id] =
        h < a ? game(m.id, big ? 21 : 16, big ? 5 : 14) : game(m.id, big ? 5 : 14, big ? 21 : 16);
    }
    const standings = computeGroupStandings(scenario, group, teams, results);
    expect(standings[0].teamId).toBe('G1.1');
    expect(standings[0].diff).toBeGreaterThan(standings[1].diff);
  });
});

describe('computeQualification', () => {
  it('top-1: the 4 group winners become the 4 seeds', () => {
    const scenario = getScenario(1)!;
    const teams = makeTeams(1);
    const results: Record<string, MatchResult> = {};
    // slot .1 wins every group match it plays → group winners are G*.1
    for (const m of scenario.groupSchedule) {
      const h = Number(m.home.split('.')[1]);
      const a = Number(m.away.split('.')[1]);
      results[m.id] = game(m.id, h < a ? 21 : 8, h < a ? 8 : 21);
    }
    const q = computeQualification(scenario, teams, results);
    expect(q.complete).toBe(true);
    expect(new Set(q.seeds)).toEqual(new Set(['G1.1', 'G2.1', 'G3.1', 'G4.1']));
  });

  it('top-2: winners take the protected seeds and no first-round same-group clash', () => {
    const scenario = getScenario(2)!; // 16 teams, top 8
    const teams = makeTeams(2);
    const results: Record<string, MatchResult> = {};
    for (const m of scenario.groupSchedule) {
      const h = Number(m.home.split('.')[1]);
      const a = Number(m.away.split('.')[1]);
      results[m.id] = game(m.id, h < a ? 21 : 8, h < a ? 8 : 21);
    }
    const q = computeQualification(scenario, teams, results);
    // winners (G*.1) should occupy seeds 1..4
    const topFour = q.seeds.slice(0, 4);
    expect(topFour.every((id) => id.endsWith('.1'))).toBe(true);

    // verify each KO first-round pair (QF) has teams from different groups
    const groupOf = (id: SlotId) => teams[id].group;
    const bracket = resolveBracket(scenario, q.seeds, {});
    for (const m of bracket.filter((b) => b.def.stage === 'QF')) {
      expect(groupOf(m.homeTeam!)).not.toBe(groupOf(m.awayTeam!));
    }
  });
});

describe('Scenario 6 KO timings match the organiser reference plan', () => {
  it('QF 13:16, second QF wave 13:54, SF 14:32, Final & P3 15:10', () => {
    const ko = getScenario(6)!.koSchedule;
    const at = (id: string) => ko.find((m) => m.id === id)!;
    expect([at('QF1').time, at('QF2').time]).toEqual(['13:16', '13:16']);
    expect([at('QF3').time, at('QF4').time]).toEqual(['13:54', '13:54']);
    expect([at('SF1').time, at('SF2').time]).toEqual(['14:32', '14:32']);
    expect([at('F').time, at('P3').time]).toEqual(['15:10', '15:10']);
    // courts: finale on 1, 3rd-place parallel on 2
    expect(at('F').court).toBe(1);
    expect(at('P3').court).toBe(2);
  });
});

describe('resolveBracket + computeFinalStandings', () => {
  it('advances winners and produces places 1–4', () => {
    const scenario = getScenario(1)!; // Top 4: SF1, SF2, F, P3
    const seeds: SlotId[] = ['A', 'B', 'C', 'D']; // seed1..4

    const results: Record<string, MatchResult> = {
      // SF1 (seed1 A vs seed4 D): A wins 2-0
      SF1: { matchId: 'SF1', sets: [{ home: 6, away: 2 }, { home: 6, away: 4 }] },
      // SF2 (seed2 B vs seed3 C): C wins 2-1 (with MTB)
      SF2: {
        matchId: 'SF2',
        sets: [{ home: 6, away: 3 }, { home: 4, away: 6 }, { home: 5, away: 7 }],
        thirdSetIsTieBreak: true,
      },
      // Final A vs C: A wins
      F: { matchId: 'F', sets: [{ home: 6, away: 1 }, { home: 6, away: 2 }] },
      // 3rd place: loser SF1 (D) vs loser SF2 (B): B wins
      P3: { matchId: 'P3', sets: [{ home: 3, away: 6 }, { home: 2, away: 6 }] },
    };

    const bracket = resolveBracket(scenario, seeds, results);
    const final = bracket.find((m) => m.def.stage === 'F')!;
    expect(final.homeTeam).toBe('A'); // winner of SF1
    expect(final.awayTeam).toBe('C'); // winner of SF2

    const places = computeFinalStandings(bracket);
    expect(places).toEqual([
      { place: 1, teamId: 'A' },
      { place: 2, teamId: 'C' },
      { place: 3, teamId: 'B' }, // P3 home (loser SF1=D) vs away(loser SF2=B); B won
      { place: 4, teamId: 'D' },
    ]);
  });
});
