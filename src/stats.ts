// Pure stats/streak logic (no storage access), so it's easy to test.

export interface Stats {
  played: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  /** Puzzle number of the last win, or 0 if never won. */
  lastWonPuzzle: number;
  /** Key = number of guesses ("1".."9", "10+"), value = how many wins took that many. */
  distribution: Record<string, number>;
}

export function emptyStats(): Stats {
  return { played: 0, wins: 0, currentStreak: 0, maxStreak: 0, lastWonPuzzle: 0, distribution: {} };
}

export function bucket(guessCount: number): string {
  return guessCount >= 10 ? '10+' : String(guessCount);
}

export const BUCKETS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10+'] as const;

/** Call once, when the first guess of a puzzle is made. */
export function recordStart(stats: Stats): Stats {
  return { ...stats, played: stats.played + 1 };
}

/** Call once, when a puzzle is solved. */
export function recordWin(stats: Stats, puzzle: number, guessCount: number): Stats {
  const continues = stats.lastWonPuzzle === puzzle - 1;
  const currentStreak = continues ? stats.currentStreak + 1 : 1;
  const key = bucket(guessCount);
  return {
    ...stats,
    wins: stats.wins + 1,
    currentStreak,
    maxStreak: Math.max(stats.maxStreak, currentStreak),
    lastWonPuzzle: puzzle,
    distribution: { ...stats.distribution, [key]: (stats.distribution[key] ?? 0) + 1 },
  };
}

/** Call once, when the player gives up on today's puzzle: it counts as played, not won, and ends the streak. */
export function recordGiveUp(stats: Stats): Stats {
  return { ...stats, currentStreak: 0 };
}

/** The streak to display today: it's broken if neither today nor yesterday was won. */
export function displayStreak(stats: Stats, todayPuzzle: number): number {
  return stats.lastWonPuzzle >= todayPuzzle - 1 ? stats.currentStreak : 0;
}
