// Picks the daily term deterministically from the UTC date, so every player gets the same one.

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Day #1 of the game. Every day since then is playable in the archive.
 * Set 7 days before the first real day (2026-11-22) so the archive starts with a week of games.
 */
export const LAUNCH_DAY_UTC = Date.UTC(2026, 10, 15); // 2026-11-15 (months are 0-based)

/** Fixed seed so the shuffled order is the same for everyone. Changing it reshuffles every day. */
const ORDER_SEED = 0x41494d4c; // "AIML"

/** Days since launch for the given moment, in UTC (day #1 = launch day). */
export function puzzleNumber(now: Date): number {
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor((todayUtc - LAUNCH_DAY_UTC) / DAY_MS) + 1;
}

/** The UTC date (midnight) of a puzzle number. */
export function puzzleDate(puzzle: number): Date {
  return new Date(LAUNCH_DAY_UTC + (puzzle - 1) * DAY_MS);
}

/** Milliseconds until the next UTC midnight (when the next term unlocks). */
export function msUntilNextPuzzle(now: Date): number {
  const nextMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return nextMidnight - now.getTime();
}

/** mulberry32: a tiny, well-known seeded PRNG. Returns floats in [0, 1). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates shuffle with a seeded PRNG. Does not modify the input. */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const out = [...items];
  const rand = seededRandom(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * The answer for a given puzzle number. Terms are sorted by id and shuffled once with a fixed
 * seed, and the game walks through that order, so no term repeats until all have been used.
 * Note: adding terms reshuffles the order (fine for a hobby game, but deploy changes at UTC midnight
 * if you want today's answer to stay the same).
 */
export function dailyTerm<T extends { id: string }>(terms: readonly T[], puzzle: number): T {
  if (terms.length === 0) throw new Error('No terms');
  const sorted = [...terms].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const order = seededShuffle(sorted, ORDER_SEED);
  const index = (((puzzle - 1) % order.length) + order.length) % order.length;
  return order[index];
}
