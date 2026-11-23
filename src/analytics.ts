// Anonymous game events for the GoatCounter dashboard (https://aimldle.goatcounter.com).
// No cookies, no personal data: just "this happened once". If GoatCounter is blocked (ad blockers)
// or hasn't loaded yet, events are silently dropped and the game is unaffected.

interface GoatCounter {
  count?: (vars: { path: string; title?: string; event?: boolean }) => void;
}

declare global {
  interface Window {
    goatcounter?: GoatCounter;
  }
}

export type GameEvent =
  | 'daily-win'
  | 'archive-win'
  | 'practice-win'
  | 'daily-giveup'
  | 'archive-giveup'
  | 'practice-giveup'
  | 'share'
  | 'hint'
  | 'browse-terms'
  | 'archive-play'
  | 'practice-start';

export function track(event: GameEvent): void {
  if (!import.meta.env.PROD) return; // never count local development
  try {
    window.goatcounter?.count?.({ path: event, title: event, event: true });
  } catch {
    // Analytics must never break the game.
  }
}
