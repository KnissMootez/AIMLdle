import { describe, expect, it } from 'vitest';
import { displayStreak, emptyStats, recordGiveUp, recordStart, recordWin } from './stats.ts';
import { buildShareText } from './share.ts';

describe('stats', () => {
  it('counts plays and wins', () => {
    const s = recordWin(recordStart(emptyStats()), 1, 4);
    expect(s).toMatchObject({ played: 1, wins: 1, currentStreak: 1, maxStreak: 1, lastWonPuzzle: 1 });
    expect(s.distribution).toEqual({ '4': 1 });
  });

  it('grows the streak on consecutive days and resets after a gap', () => {
    let s = emptyStats();
    s = recordWin(s, 1, 3);
    s = recordWin(s, 2, 5);
    s = recordWin(s, 3, 2);
    expect(s.currentStreak).toBe(3);
    s = recordWin(s, 5, 2); // skipped day 4
    expect(s.currentStreak).toBe(1);
    expect(s.maxStreak).toBe(3);
  });

  it('giving up keeps the game as played, not won, and ends the streak', () => {
    let s = recordWin(recordStart(emptyStats()), 1, 3);
    s = recordGiveUp(recordStart(s));
    expect(s).toMatchObject({ played: 2, wins: 1, currentStreak: 0, maxStreak: 1 });
    expect(displayStreak(s, 2)).toBe(0);
    expect(recordWin(recordStart(s), 3, 4).currentStreak).toBe(1);
  });

  it('buckets long games as 10+', () => {
    expect(recordWin(emptyStats(), 1, 14).distribution).toEqual({ '10+': 1 });
  });

  it('shows a streak as broken once a whole day is missed', () => {
    const s = recordWin(recordWin(emptyStats(), 1, 3), 2, 3);
    expect(displayStreak(s, 2)).toBe(2); // won today
    expect(displayStreak(s, 3)).toBe(2); // today not played yet: still alive
    expect(displayStreak(s, 4)).toBe(0); // missed day 3
  });
});

describe('buildShareText', () => {
  it('uses one emoji per tile and no spoilers', () => {
    const text = buildShareText(7, [['wrong', 'partial', 'higher'], ['correct', 'correct', 'correct']], 'https://x.dev');
    expect(text).toBe('AIMLdle #7: solved in 2 guesses\n🟥🟧⬆️\n🟩🟩🟩\nhttps://x.dev');
  });

  it('says "guess" for a one-guess win', () => {
    expect(buildShareText(1, [['correct']], 'u')).toBe('AIMLdle #1: solved in 1 guess\n🟩\nu');
  });

  it('mentions hints when some were used', () => {
    expect(buildShareText(4, [['correct']], 'u', { hints: 1 }).split('\n')[0]).toBe('AIMLdle #4: solved in 1 guess + 1 hint');
    expect(buildShareText(4, [['correct']], 'u', { hints: 2 }).split('\n')[0]).toBe('AIMLdle #4: solved in 1 guess + 2 hints');
  });

  it('says when the player gave up', () => {
    expect(buildShareText(5, [['wrong'], ['lower']], 'u', { gaveUp: true }).split('\n')[0])
      .toBe('AIMLdle #5: gave up after 2 guesses');
  });

  it('keeps only the last rows of long games', () => {
    const rows = Array.from({ length: 9 }, () => ['lower'] as const);
    const lines = buildShareText(2, rows, 'u', { maxRows: 6 }).split('\n');
    expect(lines[1]).toBe('…3 more');
    expect(lines).toHaveLength(1 + 1 + 6 + 1);
  });
});
