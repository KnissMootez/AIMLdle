// Hint rules: every HINT_EVERY guesses unlocks one hint, up to MAX_HINTS per game.
// A hint reveals one attribute (trait) of the answer that the player chooses.

import type { Column } from './attributes.ts';

export type TraitKey = Column['key'];

export const HINT_EVERY = 3;
export const MAX_HINTS = 3;

/** How many hints the player has earned so far. */
export function hintsUnlocked(guessCount: number): number {
  return Math.min(MAX_HINTS, Math.floor(guessCount / HINT_EVERY));
}

/** How many earned hints are not used yet. */
export function hintsAvailable(guessCount: number, used: number): number {
  return Math.max(0, hintsUnlocked(guessCount) - used);
}

/** Guesses still needed before the next hint unlocks, or null if all hints are unlocked. */
export function guessesUntilNextHint(guessCount: number): number | null {
  const unlocked = hintsUnlocked(guessCount);
  if (unlocked >= MAX_HINTS) return null;
  return (unlocked + 1) * HINT_EVERY - guessCount;
}
