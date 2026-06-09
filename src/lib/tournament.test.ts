import { describe, expect, it } from 'vitest';
import { getScenario } from '../data/scenarios';
import { computeGroupStandings, compareStandings } from './standings';
import { computeQualification } from './qualification';
import { resolveBracket, computeFinalStandings, computeBonusStandings } from './bracket';
import type { MatchResult, SlotId, Standing, Team } from '../types';

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

  it('ranks by wins first', () => {
    // Make G1.1 win all (most wins), G1.2 second, etc. by crafting scores.
    const results: Record<string, MatchResult> = {};
    for (const m of matches) {
      const h = Number(m.home.split('.')[1]);
      const a = Number(m.away.split('.')[1]);
      results[m.id] = game(m.id, h < a ? 21 : 10, h < a ? 10 : 21);
    }
    const standings = computeGroupStandings(scenario, group, teams, results);
    expect(standings.map((s) => s.teamId)).toEqual(['G1.1', 'G1.2', 'G1.3', 'G1.4']);
    expect(standings[0].won).toBe(3);
    expect(standings[3].won).toBe(0);
  });

  it('breaks a win tie by POINTS SCORED before difference', () => {
    const base = { rank: 0, played: 2, won: 1, lost: 1, matchPoints: 2 };
    // MORE: more points (15) but worse difference (+1). LESS: fewer points (10) but +7.
    const more: Standing = { ...base, teamId: 'MORE', pointsFor: 15, pointsAgainst: 14, diff: 1 };
    const less: Standing = { ...base, teamId: 'LESS', pointsFor: 10, pointsAgainst: 3, diff: 7 };
    // equal wins → the higher-scoring team ranks above, despite the smaller diff
    expect(compareStandings(more, less)).toBeLessThan(0);
    expect([less, more].sort(compareStandings)[0].teamId).toBe('MORE');
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

  it('top-8: seeds by performance, best plays worst in the QF', () => {
    const scenario = getScenario(2)!; // 16 teams, top 8
    const teams = makeTeams(2);
    const results: Record<string, MatchResult> = {};
    for (const m of scenario.groupSchedule) {
      const h = Number(m.home.split('.')[1]);
      const a = Number(m.away.split('.')[1]);
      results[m.id] = game(m.id, h < a ? 21 : 8, h < a ? 8 : 21);
    }
    const q = computeQualification(scenario, teams, results);
    // group winners (.1, 3 wins each) outrank runners-up (.2) → seeds 1..4
    expect(q.seeds.slice(0, 4).every((id) => id.endsWith('.1'))).toBe(true);
    expect(q.seeds.slice(4, 8).every((id) => id.endsWith('.2'))).toBe(true);

    // best vs worst: the QF containing seed 1 must also contain seed 8
    const bracket = resolveBracket(scenario, q.seeds, {}, q.eliminated);
    const qfWithTop = bracket.find(
      (b) => b.def.stage === 'QF' && (b.homeTeam === q.seeds[0] || b.awayTeam === q.seeds[0]),
    )!;
    const other = qfWithTop.homeTeam === q.seeds[0] ? qfWithTop.awayTeam : qfWithTop.homeTeam;
    expect(other).toBe(q.seeds[7]);
  });
});

describe('Scenario 6 KO timings — reference plan + bonus round', () => {
  it('12-min groups, 30-min KO: QF 13:25/13:58, SF 14:31, Finale der Herzen 15:04, Final 15:19', () => {
    const ko = getScenario(6)!.koSchedule;
    const at = (id: string) => ko.find((m) => m.id === id)!;
    expect([at('QF1').time, at('QF2').time]).toEqual(['13:25', '13:25']);
    expect([at('QF3').time, at('QF4').time]).toEqual(['13:58', '13:58']);
    expect([at('SF1').time, at('SF2').time]).toEqual(['14:31', '14:31']);
    // "Finale der Herzen" sits in the gap; final/P3 move back one bonus slot (15 min)
    expect([at('BONUS1').time, at('BONUS2').time]).toEqual(['15:04', '15:04']);
    expect([at('BONUS1').court, at('BONUS2').court]).toEqual([1, 2]);
    expect([at('F').time, at('P3').time]).toEqual(['15:19', '15:19']);
    expect(at('F').court).toBe(1);
    expect(at('P3').court).toBe(2);
    // KO matches: best-of-3 sets, best-of-3 games per set (no match tie-break)
    expect(at('F').format).toMatchObject({ type: 'bestOfSets', sets: 3, setTarget: 2 });
    expect(at('F').format.tieBreakTarget).toBeUndefined();
  });

  it('top-4 scenarios have no bonus round', () => {
    expect(getScenario(1)!.koSchedule.some((m) => m.stage === 'BONUS')).toBe(false);
  });
});

describe('bonus round — best vs worst, worst team', () => {
  it('resolves the 4 eliminated and crowns the worst team', () => {
    const scenario = getScenario(6)!; // has the bonus round
    const eliminated: SlotId[] = ['E1', 'E2', 'E3', 'E4']; // best → worst
    // BONUS1 = best(E1) vs worst(E4); BONUS2 = 2nd(E2) vs 3rd(E3)
    const results: Record<string, MatchResult> = {
      BONUS1: game('BONUS1', 15, 6), // E1 beats E4
      BONUS2: game('BONUS2', 10, 12), // E3 beats E2
    };
    const bracket = resolveBracket(scenario, [], results, eliminated);
    const bonus = computeBonusStandings(bracket, eliminated)!;
    // winners E1,E3 take 5th/6th; losers E2,E4 take 7th/8th (by ranking)
    expect(bonus.places.map((p) => p.teamId)).toEqual(['E1', 'E3', 'E2', 'E4']);
    expect(bonus.worstTeamId).toBe('E4');
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
