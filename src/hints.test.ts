import { describe, expect, it } from 'vitest';
import { guessesUntilNextHint, hintsAvailable, hintsUnlocked } from './hints.ts';

describe('hints', () => {
  it('unlocks one hint every 3 guesses, up to 3', () => {
    expect([0, 2, 3, 5, 6, 9, 20].map(hintsUnlocked)).toEqual([0, 0, 1, 1, 2, 3, 3]);
  });

  it('subtracts hints already used', () => {
    expect(hintsAvailable(6, 0)).toBe(2);
    expect(hintsAvailable(6, 1)).toBe(1);
    expect(hintsAvailable(6, 2)).toBe(0);
    expect(hintsAvailable(2, 0)).toBe(0);
  });

  it('counts down to the next hint, then stops', () => {
    expect(guessesUntilNextHint(0)).toBe(3);
    expect(guessesUntilNextHint(4)).toBe(2);
    expect(guessesUntilNextHint(8)).toBe(1);
    expect(guessesUntilNextHint(9)).toBeNull();
  });
});
