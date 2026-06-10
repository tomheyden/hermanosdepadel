import { describe, it, expect } from 'vitest';
import { awardPoint, setWinsOf, koWinner, isTieBreakSet, pointLabel } from './tennis';
import type { MatchFormat, SetScore } from '../types';

// KO format: best-of-3, sets to 4 games (tennis points), tie-break to 7 at 1:1.
const FMT: MatchFormat = { type: 'bestOfSets', goldenPoint: true, sets: 3, setTarget: 4, tieBreakTarget: 7 };

function play(seq: Array<'home' | 'away'>) {
  let state = { sets: [{ home: 0, away: 0 }] as SetScore[], game: { home: 0, away: 0 } as SetScore };
  for (const side of seq) state = awardPoint(state.sets, state.game, side, FMT);
  return state;
}

const winGame = (side: 'home' | 'away'): Array<'home' | 'away'> => [side, side, side, side];
const winSet = (side: 'home' | 'away') => [...winGame(side), ...winGame(side), ...winGame(side), ...winGame(side)];

describe('tennis KO scoring', () => {
  it('labels points 0/15/30/40', () => {
    expect([0, 1, 2, 3].map(pointLabel)).toEqual(['0', '15', '30', '40']);
  });

  it('four points win a game (points reset, game tally +1)', () => {
    const s = play(winGame('home'));
    expect(s.sets[0]).toEqual({ home: 1, away: 0 });
    expect(s.game).toEqual({ home: 0, away: 0 });
  });

  it('golden point: at 40:40 the next point wins the game', () => {
    let s = play(['home', 'home', 'home', 'away', 'away', 'away']); // 40:40
    expect(s.game).toEqual({ home: 3, away: 3 });
    s = awardPoint(s.sets, s.game, 'home', FMT);
    expect(s.sets[0]).toEqual({ home: 1, away: 0 });
    expect(s.game).toEqual({ home: 0, away: 0 });
  });

  it('a set is won at 4 games and opens the next set', () => {
    const s = play(winSet('home'));
    expect(s.sets[0]).toEqual({ home: 4, away: 0 });
    expect(s.sets.length).toBe(2);
    expect(setWinsOf(s.sets, FMT)).toEqual({ home: 1, away: 0 });
  });

  it('at 1:1 sets the 3rd set is a tie-break, counted plainly to 7', () => {
    let s = play([...winSet('home'), ...winSet('away')]);
    expect(setWinsOf(s.sets, FMT)).toEqual({ home: 1, away: 1 });
    expect(s.sets.length).toBe(3);
    expect(isTieBreakSet(s.sets, FMT)).toBe(true);
    // tie-break: plain points (no 15/30/40), first to 7
    for (let p = 0; p < 7; p++) s = awardPoint(s.sets, s.game, 'home', FMT);
    expect(s.sets[2]).toEqual({ home: 7, away: 0 });
    expect(koWinner(s.sets, FMT)).toBe('home');
  });

  it('two straight sets win the match (no tie-break)', () => {
    const s = play([...winSet('home'), ...winSet('home')]);
    expect(koWinner(s.sets, FMT)).toBe('home');
    expect(isTieBreakSet(s.sets, FMT)).toBe(false);
  });
});
