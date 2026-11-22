import { describe, expect, it } from 'vitest';
import { parseState } from './storage.ts';

describe('parseState', () => {
  it('returns a fresh state for empty or broken data', () => {
    expect(parseState(null).games).toEqual({});
    expect(parseState('not json').games).toEqual({});
    expect(parseState('42').stats.played).toBe(0);
  });

  it('keeps per-puzzle games and drops malformed ones', () => {
    const s = parseState(JSON.stringify({ games: { '3': ['pca', 'svm'], '4': 'oops', '5': [1, 2] } }));
    expect(s.games).toEqual({ '3': ['pca', 'svm'] });
  });

  it('keeps the list of given-up puzzles, dropping junk', () => {
    expect(parseState(JSON.stringify({ gaveUp: [3, 'x', 5.5, 7] })).gaveUp).toEqual([3, 7]);
    expect(parseState(JSON.stringify({ gaveUp: 'nope' })).gaveUp).toEqual([]);
  });

  it('keeps revealed hints per puzzle', () => {
    const s = parseState(JSON.stringify({ hints: { '2': ['year', 'category'], '3': null } }));
    expect(s.hints).toEqual({ '2': ['year', 'category'] });
  });

  it('migrates the old single-day format', () => {
    const s = parseState(JSON.stringify({ puzzle: 1, guesses: ['relu'], seenHelp: true, stats: { played: 1 } }));
    expect(s.games).toEqual({ '1': ['relu'] });
    expect(s.seenHelp).toBe(true);
    expect(s.stats.played).toBe(1);
    expect(s.stats.wins).toBe(0); // missing stats fields get defaults
  });
});
