import { describe, expect, it } from 'vitest';
import { dailyTerm, msUntilNextPuzzle, puzzleDate, puzzleNumber, seededShuffle } from './daily.ts';

const terms = Array.from({ length: 10 }, (_, i) => ({ id: `t${i}` }));

describe('puzzleNumber', () => {
  it('is 1 on launch day and counts UTC days', () => {
    expect(puzzleNumber(new Date('2026-11-15T00:00:00Z'))).toBe(1);
    expect(puzzleNumber(new Date('2026-11-15T23:59:59Z'))).toBe(1);
    expect(puzzleNumber(new Date('2026-11-16T00:00:00Z'))).toBe(2);
    expect(puzzleNumber(new Date('2026-11-22T12:00:00Z'))).toBe(8);
    expect(puzzleNumber(new Date('2027-11-15T12:00:00Z'))).toBe(366);
  });

  it('ignores the local time zone (uses UTC)', () => {
    // 23:30 on Nov 15 in UTC-5 is already Nov 16 in UTC.
    expect(puzzleNumber(new Date('2026-11-15T23:30:00-05:00'))).toBe(2);
  });
});

describe('puzzleDate', () => {
  it('is the inverse of puzzleNumber', () => {
    expect(puzzleDate(1).toISOString()).toBe('2026-11-15T00:00:00.000Z');
    expect(puzzleDate(8).toISOString()).toBe('2026-11-22T00:00:00.000Z');
    for (const n of [1, 2, 30, 400]) expect(puzzleNumber(puzzleDate(n))).toBe(n);
  });
});

describe('msUntilNextPuzzle', () => {
  it('counts down to the next UTC midnight', () => {
    expect(msUntilNextPuzzle(new Date('2026-11-22T23:00:00Z'))).toBe(60 * 60 * 1000);
  });
});

describe('seededShuffle', () => {
  it('is deterministic and keeps every item', () => {
    const a = seededShuffle(terms, 42);
    expect(seededShuffle(terms, 42)).toEqual(a);
    expect([...a].sort((x, y) => x.id.localeCompare(y.id))).toEqual(terms);
  });

  it('does not modify its input', () => {
    const copy = [...terms];
    seededShuffle(terms, 1);
    expect(terms).toEqual(copy);
  });
});

describe('dailyTerm', () => {
  it('gives everyone the same term for the same day, whatever the input order', () => {
    const reversed = [...terms].reverse();
    expect(dailyTerm(reversed, 5)).toEqual(dailyTerm(terms, 5));
  });

  it('uses every term once before repeating', () => {
    const firstCycle = new Set(Array.from({ length: 10 }, (_, i) => dailyTerm(terms, i + 1).id));
    expect(firstCycle.size).toBe(10);
    expect(dailyTerm(terms, 11)).toEqual(dailyTerm(terms, 1));
  });

  it('handles days before launch without crashing', () => {
    expect(terms).toContainEqual(dailyTerm(terms, -3));
  });
});
