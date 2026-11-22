import { describe, expect, it } from 'vitest';
import { ANSWER_POOL, TERMS } from './terms.ts';
import { dailyTerm } from './daily.ts';

describe('term data', () => {
  it('has at least 60 possible daily answers (v1 target)', () => {
    expect(ANSWER_POOL.length).toBeGreaterThanOrEqual(60);
  });

  it('only picks daily answers from the answer pool', () => {
    for (let day = 1; day <= 365; day++) {
      const answer = dailyTerm(ANSWER_POOL, day);
      expect(answer.daily).toBe(true);
      expect(TERMS).toContain(answer);
    }
  });
});
