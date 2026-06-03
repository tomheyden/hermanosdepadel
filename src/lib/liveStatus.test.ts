import { describe, expect, it } from 'vitest';
import { matchStatus } from './liveStatus';

describe('matchStatus', () => {
  it('is done once a final result exists', () => {
    expect(matchStatus(true, false)).toBe('done');
    expect(matchStatus(true, true)).toBe('done');
  });

  it('is live when started and not yet finalised', () => {
    expect(matchStatus(false, true)).toBe('live');
  });

  it('is upcoming when neither started nor finalised', () => {
    expect(matchStatus(false, false)).toBe('upcoming');
  });
});
