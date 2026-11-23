import './style.css';
import {
  CATEGORIES,
  COLUMNS,
  DIFFICULTIES,
  FAMILIES,
  FIELDS,
  LEARNING_TYPES,
  TASKS,
  type Term,
} from './attributes.ts';
import { compareTerms, YEAR_CLOSE_WITHIN, type Tile, type TileState } from './compare.ts';
import { dailyTerm, msUntilNextPuzzle, puzzleDate, puzzleNumber } from './daily.ts';
import { guessesUntilNextHint, hintsAvailable, HINT_EVERY, MAX_HINTS, type TraitKey } from './hints.ts';
import { track } from './analytics.ts';
import { findExact, findMatches, normalize } from './search.ts';
import { buildShareText } from './share.ts';
import { BUCKETS, bucket, displayStreak, recordGiveUp, recordStart, recordWin } from './stats.ts';
import { loadPrefs, loadState, resetIfNewDevSession, savePrefs, saveState } from './storage.ts';
import { ANSWER_POOL, TERMS, TERMS_BY_ID } from './terms.ts';

// ---------- State ----------

/** daily = today's puzzle, archive = a past day's puzzle, practice = random term, not saved. */
type Mode = 'daily' | 'archive' | 'practice';

interface Game {
  mode: Mode;
  /** Puzzle number for daily/archive games, 0 for practice. */
  puzzle: number;
  answer: Term;
  guesses: Term[];
  /** Traits of the answer revealed by hints, in the order they were used. */
  hints: TraitKey[];
  /** The player gave up and the answer was revealed. */
  gaveUp: boolean;
}

const today = puzzleNumber(new Date());
const dailyAnswer = dailyTerm(ANSWER_POOL, today);
// `npm run dev` restarts always start from a clean slate (removed from production builds).
if (import.meta.env.DEV) resetIfNewDevSession(__DEV_SESSION__);
const saved = loadState();

function savedGuesses(puzzle: number): Term[] {
  return (saved.games[puzzle] ?? []).map((id) => TERMS_BY_ID.get(id)).filter((t): t is Term => !!t);
}

function puzzleGame(puzzle: number): Game {
  return {
    mode: puzzle === today ? 'daily' : 'archive',
    puzzle,
    answer: dailyTerm(ANSWER_POOL, puzzle),
    guesses: savedGuesses(puzzle),
    gaveUp: saved.gaveUp.includes(puzzle),
    hints: (saved.hints[puzzle] ?? []).filter((k): k is TraitKey => COLUMNS.some((c) => c.key === k)),
  };
}

const dailyGame = () => puzzleGame(today);

function practiceGame(): Game {
  track('practice-start');
  const pool = ANSWER_POOL.filter((t) => t.id !== dailyAnswer.id);
  return { mode: 'practice', puzzle: 0, answer: pool[Math.floor(Math.random() * pool.length)], guesses: [], hints: [], gaveUp: false };
}

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const formatPuzzleDate = (puzzle: number) => DATE_FORMAT.format(puzzleDate(puzzle));

let game = dailyGame();
const isWon = (g: Game) => g.guesses.some((t) => t.id === g.answer.id);
/** Finished: solved or given up. */
const isOver = (g: Game) => isWon(g) || g.gaveUp;

// ---------- DOM helpers ----------

function $<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

type Child = Node | string | null | undefined | false;

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, string> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'class') node.className = value;
    else node.setAttribute(key, value);
  }
  for (const child of children) if (child) node.append(child);
  return node;
}

const els = {
  status: $<HTMLParagraphElement>('status'),
  form: $<HTMLFormElement>('guess-form'),
  input: $<HTMLInputElement>('guess-input'),
  list: $<HTMLUListElement>('suggestions'),
  error: $<HTMLParagraphElement>('guess-error'),
  hints: $<HTMLElement>('hints'),
  result: $<HTMLElement>('result'),
  boardWrap: $<HTMLDivElement>('board-wrap'),
  boardTools: $<HTMLDivElement>('board-tools'),
  fitBtn: $<HTMLButtonElement>('fit-btn'),
  board: $<HTMLDivElement>('board'),
  help: $<HTMLDialogElement>('help-dialog'),
  about: $<HTMLDialogElement>('about-dialog'),
  archive: $<HTMLDialogElement>('archive-dialog'),
  terms: $<HTMLDialogElement>('terms-dialog'),
  browse: $<HTMLButtonElement>('browse-btn'),
  stats: $<HTMLDialogElement>('stats-dialog'),
  toast: $<HTMLDivElement>('toast'),
};

const ICON: Record<TileState, string> = {
  correct: '✓',
  partial: '≈',
  wrong: '✗',
  higher: '↑',
  lower: '↓',
  'higher-close': '≈↑',
  'lower-close': '≈↓',
};
const STATE_LABEL: Record<TileState, string> = {
  correct: 'match',
  partial: 'partial match',
  wrong: 'no match',
  higher: 'answer is later / harder',
  lower: 'answer is earlier / easier',
  'higher-close': `close: answer is up to ${YEAR_CLOSE_WITHIN} years later`,
  'lower-close': `close: answer is up to ${YEAR_CLOSE_WITHIN} years earlier`,
};

/**
 * One wording for the tile meanings, used by BOTH the legend under the board and the help dialog,
 * so they can never disagree. [chip classes + symbols, short text]
 */
const LEGEND: [[string, string][], string][] = [
  [[['tile--correct', '✓']], 'match'],
  [[['tile--partial', '≈']], 'partial: some values shared'],
  [[['tile--partial', '↑'], ['tile--partial', '↓']], `close: year within ${YEAR_CLOSE_WITHIN}`],
  [[['tile--wrong', '✗']], 'no match'],
  [[['tile--higher', '↑']], STATE_LABEL.higher],
  [[['tile--lower', '↓']], STATE_LABEL.lower],
];

function legendItems(tag: 'span' | 'li', itemClass: string): HTMLElement[] {
  return LEGEND.map(([chips, text]) =>
    h(tag, { class: itemClass }, ...chips.map(([cls, sym]) => h('span', { class: `chip ${cls}` }, sym)), ` ${text}`));
}

// Soft hyphens (­) mark where long words may break in narrow tiles, e.g. "Classifi-cation".
// Browsers only show the hyphen when they actually break there.
const SOFT_HYPHENS: Record<string, string> = {
  Classification: 'Classifi­cation',
  Component: 'Compo­nent',
  Dimensionality: 'Dimension­ality',
  Optimization: 'Optimi­zation',
  Information: 'Infor­mation',
  Intermediate: 'Inter­mediate',
  Unsupervised: 'Unsuper­vised',
  Supervised: 'Super­vised',
  supervised: 'super­vised',
  Mathematics: 'Mathe­matics',
  Foundations: 'Foun­dations',
  Evaluation: 'Evalu­ation',
  Regression: 'Regres­sion',
  Statistical: 'Statis­tical',
  Statistics: 'Statis­tics',
  Clustering: 'Cluster­ing',
  modeling: 'model­ing',
  Technique: 'Tech­nique',
};

function softHyphenate(text: string): string {
  return text.replace(/[A-Za-z]{9,}/g, (word) => SOFT_HYPHENS[word] ?? word);
}

const prefersReducedMotion =() => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Delay between tiles flipping in, left to right. Keep FLIP_MS in sync with the CSS flip animation. */
const TILE_DELAY_MS = 280;
const FLIP_MS = 550;

// ---------- Autocomplete ----------

let suggestions: Term[] = [];
let active = -1;

function guessedIds(): Set<string> {
  return new Set(game.guesses.map((t) => t.id));
}

function renderSuggestions(): void {
  const open = suggestions.length > 0;
  els.list.hidden = !open;
  els.input.setAttribute('aria-expanded', String(open));
  els.list.replaceChildren(
    ...suggestions.map((term, i) => {
      const li = h('li', {
        id: `opt-${term.id}`,
        role: 'option',
        class: 'suggestions__item',
        'aria-selected': String(i === active),
      }, term.name);
      // mousedown (not click) so the input doesn't lose focus first.
      li.addEventListener('mousedown', (e) => {
        e.preventDefault();
        submitGuess(term);
      });
      return li;
    }),
  );
  if (active >= 0) {
    els.input.setAttribute('aria-activedescendant', `opt-${suggestions[active].id}`);
    els.list.children[active]?.scrollIntoView({ block: 'nearest' });
  } else {
    els.input.removeAttribute('aria-activedescendant');
  }
}

function updateSuggestions(): void {
  suggestions = findMatches(TERMS, els.input.value, guessedIds());
  active = suggestions.length ? 0 : -1;
  els.error.textContent = '';
  renderSuggestions();
}

function closeSuggestions(): void {
  suggestions = [];
  active = -1;
  renderSuggestions();
}

els.input.addEventListener('input', updateSuggestions);
els.input.addEventListener('blur', () => setTimeout(closeSuggestions, 100));
els.input.addEventListener('keydown', (e) => {
  if (!suggestions.length) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    active = (active + 1) % suggestions.length;
    renderSuggestions();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    active = (active - 1 + suggestions.length) % suggestions.length;
    renderSuggestions();
  } else if (e.key === 'Escape') {
    closeSuggestions();
  }
});

els.form.addEventListener('submit', (e) => {
  e.preventDefault();
  const exact = findExact(TERMS, els.input.value);
  const pick = active >= 0 ? suggestions[active] : exact;
  if (!pick) {
    showError(els.input.value.trim() ? 'Pick a term from the list.' : 'Type a term first.');
    return;
  }
  if (guessedIds().has(pick.id)) {
    showError(`You already guessed ${pick.name}.`);
    return;
  }
  submitGuess(pick);
});

function showError(message: string): void {
  els.error.textContent = message;
  els.input.classList.remove('shake');
  void els.input.offsetWidth; // restart the animation
  els.input.classList.add('shake');
}

// ---------- Guessing ----------

function submitGuess(term: Term): void {
  if (isOver(game) || guessedIds().has(term.id)) return;
  game.guesses.push(term);
  els.input.value = '';
  closeSuggestions();

  const won = term.id === game.answer.id;
  if (game.mode === 'daily') {
    // Stats and streaks only count today's puzzle, never archive or practice games.
    if (game.guesses.length === 1) saved.stats = recordStart(saved.stats);
    if (won) saved.stats = recordWin(saved.stats, today, game.guesses.length);
  }
  if (game.mode !== 'practice') {
    saved.games[game.puzzle] = game.guesses.map((t) => t.id);
    saveState(saved);
  }
  if (won) track(`${game.mode}-win`);
  render({ animateLatest: true });
}

// ---------- Hints ----------

let hintPickerOpen = false;

function traitValue(term: Term, key: TraitKey): string {
  const v = term[key];
  return Array.isArray(v) ? v.join(', ') : String(v);
}

/** Traits the player already knows exactly, because some guess got a green tile for them. */
function knownTraits(): Set<TraitKey> {
  const known = new Set<TraitKey>();
  for (const g of game.guesses) {
    for (const tile of compareTerms(g, game.answer)) if (tile.state === 'correct') known.add(tile.column.key);
  }
  return known;
}

function revealHint(key: TraitKey): void {
  if (game.hints.includes(key) || hintsAvailable(game.guesses.length, game.hints.length) <= 0) return;
  game.hints.push(key);
  track('hint');
  hintPickerOpen = false;
  if (game.mode !== 'practice') {
    saved.hints[game.puzzle] = [...game.hints];
    saveState(saved);
  }
  renderHints();
}

function renderHints(): void {
  const n = game.guesses.length;
  const used = game.hints.length;
  els.hints.hidden = isOver(game) || (n === 0 && used === 0);
  if (els.hints.hidden) return;

  const revealed = game.hints.map((key) => {
    const column = COLUMNS.find((c) => c.key === key)!;
    return h('span', { class: 'hint-chip' },
      h('span', { class: 'fact__label' }, column.label), ' ', traitValue(game.answer, key));
  });

  const available = hintsAvailable(n, used);
  const children: Node[] = [];
  if (revealed.length) children.push(h('div', { class: 'hints__revealed' }, h('span', { class: 'hints__title' }, 'Answer:'), ...revealed));
  // One row: hint button (or countdown) on the left, give up on the right. The trait picker goes below.
  const bar = h('div', { class: 'hints__bar' });
  children.push(bar);

  if (available > 0) {
    const toggle = h('button', { class: 'btn btn--hint', type: 'button', 'aria-expanded': String(hintPickerOpen) },
      `💡 Reveal a trait (${available} ${available === 1 ? 'hint' : 'hints'} available)`);
    toggle.addEventListener('click', () => {
      hintPickerOpen = !hintPickerOpen;
      renderHints();
    });
    bar.append(toggle);

    if (hintPickerOpen) {
      const known = knownTraits();
      const picker = h('div', { class: 'hints__picker', role: 'group', 'aria-label': 'Choose a trait to reveal' },
        ...COLUMNS.filter((c) => !game.hints.includes(c.key)).map((c) => {
          const isKnown = known.has(c.key);
          const b = h('button', { class: 'btn btn--trait', type: 'button' }, isKnown ? `${c.label} ✓` : c.label);
          if (isKnown) {
            b.disabled = true;
            b.title = 'You already found this one';
          }
          b.addEventListener('click', () => revealHint(c.key));
          return b;
        }),
      );
      children.push(picker);
    }
  } else {
    const next = guessesUntilNextHint(n);
    const text = used >= MAX_HINTS || next === null
      ? 'No hints left. You can do it!'
      : `💡 Hint unlocks in ${next} ${next === 1 ? 'guess' : 'guesses'}`;
    bar.append(h('p', { class: 'hints__next' }, text));
  }

  // Give up: two clicks, so a stray tap can't end the game.
  const giveUp = h('button', { class: `link-btn hints__giveup${giveUpArmed ? ' hints__giveup--armed' : ''}`, type: 'button' },
    giveUpArmed ? 'Really? Show the answer' : 'Give up');
  giveUp.addEventListener('click', () => {
    if (giveUpArmed) {
      giveUpNow();
      return;
    }
    giveUpArmed = true;
    renderHints();
    window.clearTimeout(giveUpTimer);
    giveUpTimer = window.setTimeout(() => {
      giveUpArmed = false;
      renderHints();
    }, 4000);
  });
  bar.append(giveUp);

  els.hints.replaceChildren(...children);
}

let giveUpArmed = false;
let giveUpTimer: number | undefined;

function giveUpNow(): void {
  if (isOver(game) || game.guesses.length === 0) return;
  giveUpArmed = false;
  window.clearTimeout(giveUpTimer);
  game.gaveUp = true;
  track(`${game.mode}-giveup`);
  if (game.mode === 'daily') saved.stats = recordGiveUp(saved.stats);
  if (game.mode !== 'practice') {
    if (!saved.gaveUp.includes(game.puzzle)) saved.gaveUp.push(game.puzzle);
    saveState(saved);
  }
  render();
  els.result.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
}

// ---------- Rendering ----------

function renderStatus(): void {
  const n = game.guesses.length;
  const count = n ? ` · ${n} ${n === 1 ? 'guess' : 'guesses'}` : '';
  if (game.mode === 'daily') {
    els.status.replaceChildren(h('strong', {}, `#${today}`), ` Guess today's AI / ML term${count}`);
  } else if (game.mode === 'archive') {
    els.status.replaceChildren(
      h('strong', { class: 'badge' }, 'Archive'),
      ` #${game.puzzle} · ${formatPuzzleDate(game.puzzle)}${count}`,
    );
  } else {
    els.status.replaceChildren(h('strong', { class: 'badge' }, 'Practice'), ` Unlimited random term${count}`);
  }
}

function tileNode(tile: Tile, index: number, animate: boolean): HTMLElement {
  const node = h('div', {
    class: `tile tile--${tile.state}${animate ? ' tile--flip' : ''}`,
    role: 'cell',
    'aria-label': `${tile.column.label}: ${tile.text}, ${STATE_LABEL[tile.state]}`,
  },
  h('span', { class: 'tile__icon', 'aria-hidden': 'true' }, ICON[tile.state]),
  h('span', { class: 'tile__text', 'aria-hidden': 'true' }, softHyphenate(tile.text)),
  );
  if (animate) node.style.animationDelay = `${(index + 1) * TILE_DELAY_MS}ms`;
  return node;
}

function renderBoard(animateLatest: boolean): void {
  const rows = [...game.guesses].reverse();
  els.boardWrap.hidden = rows.length === 0;
  const header = h('div', { class: 'board__row board__row--head', role: 'row' },
    h('div', { class: 'board__pin', role: 'columnheader' }, h('div', { class: 'board__head' }, 'Term')),
    ...COLUMNS.map((c) => h('div', { class: 'board__head', role: 'columnheader' }, c.label)),
  );
  const body = rows.map((guess, i) => {
    const animate = animateLatest && i === 0 && !prefersReducedMotion();
    const tiles = compareTerms(guess, game.answer);
    const allCorrect = guess.id === game.answer.id;
    return h('div', { class: 'board__row', role: 'row' },
      h('div', { class: 'board__pin', role: 'rowheader' },
        h('div', {
          class: `tile board__name ${allCorrect ? 'tile--correct' : 'tile--term'}${animate ? ' tile--flip' : ''}`,
        }, guess.name),
      ),
      ...tiles.map((t, idx) => tileNode(t, idx, animate)),
    );
  });
  els.board.replaceChildren(header, ...body);
  applyFit();
}

// ---------- Fit board to screen ----------

const prefs = loadPrefs();

/**
 * When the board is wider than the screen, offer a toggle that shrinks it (CSS zoom) so all
 * columns are visible at once. Otherwise the board scrolls sideways with the term column pinned.
 */
function applyFit(): void {
  els.board.style.zoom = '';
  if (els.boardWrap.hidden) {
    els.boardTools.hidden = true;
    return;
  }
  const styles = getComputedStyle(els.boardWrap);
  const available = els.boardWrap.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
  const natural = els.board.scrollWidth;
  const overflows = natural > available + 1;
  els.boardTools.hidden = !overflows;
  els.fitBtn.innerHTML = prefs.fitBoard ? `${ICON_SHRINK}<span>Actual size</span>` : `${ICON_EXPAND}<span>Fit to screen</span>`;
  els.fitBtn.setAttribute('aria-pressed', String(prefs.fitBoard));
  if (overflows && prefs.fitBoard) els.board.style.zoom = String(available / natural);
  updateScrolled();
}

// Four arrows pointing out (expand) / in (shrink).
const ICON_EXPAND =
  '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5M4 4l6 6M20 4l-6 6M4 20l6-6M20 20l-6-6"/></svg>';
const ICON_SHRINK =
  '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 4v6H4M14 4v6h6M10 20v-6H4M14 20v-6h6M4 4l6 6M20 4l-6 6M4 20l6-6M20 20l-6-6"/></svg>';

/** Mark the board as scrolled sideways, so the pinned term column covers what slides under it. */
function updateScrolled(): void {
  els.boardWrap.classList.toggle('is-scrolled', els.boardWrap.scrollLeft > 0);
}
els.boardWrap.addEventListener('scroll', updateScrolled, { passive: true });

els.fitBtn.addEventListener('click', () => {
  prefs.fitBoard = !prefs.fitBoard;
  savePrefs(prefs);
  applyFit();
});
window.addEventListener('resize', applyFit);

let countdownTimer: number | undefined;

function renderCountdown(target: HTMLElement): void {
  window.clearInterval(countdownTimer);
  const tick = () => {
    const ms = msUntilNextPuzzle(new Date());
    if (puzzleNumber(new Date()) !== today) {
      window.clearInterval(countdownTimer);
      const reload = h('button', { class: 'btn btn--primary', type: 'button' }, 'Play the new term');
      reload.addEventListener('click', () => location.reload());
      target.replaceChildren('A new term is out! ', reload);
      return;
    }
    const s = Math.floor(ms / 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    target.textContent = `Next term in ${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
  };
  tick();
  countdownTimer = window.setInterval(tick, 1000);
}

function button(label: string, onClick: () => void, primary = false): HTMLButtonElement {
  const b = h('button', { class: `btn${primary ? ' btn--primary' : ''}`, type: 'button' }, label);
  b.addEventListener('click', onClick);
  return b;
}

function renderResult(): void {
  const over = isOver(game);
  els.result.hidden = !over;
  els.form.hidden = over;
  els.result.classList.toggle('result--gaveup', game.gaveUp);
  if (!over) return;

  const t = game.answer;
  const n = game.guesses.length;
  const facts = COLUMNS.map((c) => {
    const v = t[c.key];
    return h('li', {}, h('span', { class: 'fact__label' }, c.label), ' ', Array.isArray(v) ? v.join(', ') : String(v));
  });

  const actions = h('div', { class: 'result__actions' });
  if (game.mode === 'daily') {
    actions.append(
      button('Share result', shareResult, true),
      button('Play past days', openArchive),
      button('Practice round', () => switchGame(practiceGame())),
    );
  } else if (game.mode === 'archive') {
    const older = unplayedArchive().find((p) => p < game.puzzle) ?? unplayedArchive()[0];
    actions.append(button('Share result', shareResult, true));
    if (older) actions.append(button(`Play #${older}`, () => switchGame(puzzleGame(older))));
    actions.append(
      button('All past days', openArchive),
      button("Back to today's term", () => switchGame(dailyGame())),
    );
  } else {
    actions.append(
      button('Next practice term', () => switchGame(practiceGame()), true),
      button("Back to today's term", () => switchGame(dailyGame())),
    );
  }

  const hintsUsed = game.hints.length;
  const guessWord = `${n} ${n === 1 ? 'guess' : 'guesses'}${hintsUsed ? ` + ${hintsUsed} ${hintsUsed === 1 ? 'hint' : 'hints'}` : ''}`;
  const kicker = game.gaveUp
    ? `You gave up after ${guessWord}. The answer was…`
    : {
        daily: `Solved in ${guessWord}!`,
        archive: `#${game.puzzle} solved in ${guessWord}!`,
        practice: `Practice solved in ${guessWord}!`,
      }[game.mode];

  const countdown = h('p', { class: 'result__countdown' });
  els.result.replaceChildren(
    h('p', { class: 'result__kicker' }, kicker),
    h('h2', { class: 'result__name' }, t.name),
    h('p', { class: 'result__explanation' }, t.explanation),
    h('ul', { class: 'result__facts' }, ...facts),
    h('p', { class: 'result__source' }, h('span', { class: 'fact__label' }, 'Source'), ' ', t.source),
    actions,
    countdown,
  );
  renderCountdown(countdown);
}

function render({ animateLatest = false } = {}): void {
  renderStatus();
  renderHints();
  renderBoard(animateLatest);
  const justWon = animateLatest && isWon(game);
  if (justWon && !prefersReducedMotion()) {
    // Let the tiles finish flipping before revealing the answer.
    els.form.hidden = true;
    window.setTimeout(() => {
      renderResult();
      els.result.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, COLUMNS.length * TILE_DELAY_MS + FLIP_MS + 500); // last tile done, then a short beat
  } else {
    renderResult();
  }
  if (!isOver(game)) els.input.focus({ preventScroll: true });
}

function switchGame(next: Game): void {
  game = next;
  hintPickerOpen = false;
  giveUpArmed = false;
  els.input.value = '';
  els.error.textContent = '';
  closeSuggestions();
  render();
  window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

// ---------- Share ----------

function toast(message: string): void {
  els.toast.textContent = message;
  els.toast.hidden = false;
  window.clearTimeout(Number(els.toast.dataset.timer));
  els.toast.dataset.timer = String(window.setTimeout(() => (els.toast.hidden = true), 2000));
}

async function shareResult(): Promise<void> {
  const rows = game.guesses.map((g) => compareTerms(g, game.answer).map((t) => t.state));
  track('share');
  const text = buildShareText(game.puzzle, rows, location.origin + location.pathname, {
    hints: game.hints.length,
    gaveUp: game.gaveUp,
  });
  const touch = window.matchMedia('(pointer: coarse)').matches;
  try {
    if (touch && navigator.share) {
      await navigator.share({ text });
      return;
    }
    await navigator.clipboard.writeText(text);
    toast('Result copied to clipboard');
  } catch (err) {
    if ((err as DOMException)?.name === 'AbortError') return; // user closed the share sheet
    if (copyFallback(text)) toast('Result copied to clipboard');
    else toast("Couldn't copy. Your browser blocked it.");
  }
}

function copyFallback(text: string): boolean {
  const area = h('textarea', { class: 'visually-hidden' });
  area.value = text;
  document.body.append(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  area.remove();
  return ok;
}

// ---------- Dialogs ----------

function closeButton(dialog: HTMLDialogElement): HTMLButtonElement {
  const b = h('button', { class: 'icon-btn dialog__close', type: 'button', 'aria-label': 'Close' }, '×');
  b.addEventListener('click', () => dialog.close());
  return b;
}

function openHelp(): void {
  // [label, allowed values, rule in one line]
  const values: [string, readonly string[], string][] = [
    ['Category', CATEGORIES, 'What kind of thing the term is. Methods you fit to data to then predict, cluster or embed count as Model, even if people call them algorithms (K-means, DBSCAN, PCA, GMM). Procedures that fit another model\'s parameters are Optimization (Gradient Descent, EM).'],
    ['Task', TASKS, 'Every task it is commonly used for.'],
    ['Learning', LEARNING_TYPES, 'Every setting it is commonly trained in; N/A if it is not a model or technique.'],
    ['Year', [], 'Year of the defining paper, proposal or first release, e.g. Artificial Intelligence = 1955 (the Dartmouth proposal), not 1956 (the workshop). The source is shown when you solve it.'],
    ['Field', FIELDS, 'The academic discipline the defining work came from (company research counts as computer science).'],
    ['Family', FAMILIES, 'The kind of method, not the time period: "Transformer era" = transformer models and what is built around them (ViT, CLIP, RAG, LoRA...).'],
    ['Difficulty', DIFFICULTIES, 'Roughly how far into learning ML you meet it.'],
  ];
  els.help.replaceChildren(
    closeButton(els.help),
    h('h2', { id: 'help-title' }, 'How to play'),
    h('p', {}, `Guess today's AI / ML term in as few tries as you can, from ${TERMS.length} terms.`),
    (() => {
      const p = h('p', {}, 'Not sure what to type? ');
      const b = h('button', { class: 'link-btn', type: 'button' }, `Browse all ${TERMS.length} terms`);
      b.addEventListener('click', () => {
        els.help.close();
        openTerms();
      });
      p.append(b, ' (AI, Markov Chain, Precision, Transformer…), or use the 📖 button at the top.');
      return p;
    })(),
    h('p', {}, 'Each guess shows how its attributes compare with the answer:'),
    h('ul', { class: 'help__legend' }, ...legendItems('li', '')),
    h('p', { class: 'muted' }, 'Partial only happens on Task and Learning (they can have several values). Arrows appear on Year (later / earlier) and Difficulty (harder / easier).'),
    h('h3', {}, 'Attributes'),
    h('dl', { class: 'help__attrs' },
      ...values.flatMap(([label, vals, rule]) => [
        h('dt', {}, label),
        h('dd', {}, h('span', { class: 'help__rule' }, rule), vals.length ? h('span', { class: 'help__vals' }, vals.join(' · ')) : null),
      ]),
    ),
    h('h3', {}, 'Hints'),
    h('p', {}, `Stuck? Every ${HINT_EVERY} guesses unlock a hint (up to ${MAX_HINTS}). Use one to reveal any trait of the answer, such as its Category or Year. Really stuck? Give up to see the answer (it ends your streak).`),
    h('p', { class: 'muted' }, 'When you solve it you get a short explanation and a source. A new term unlocks every day at 00:00 UTC. Missed a day? Play it from the archive (calendar button). You can also play unlimited practice rounds.'),
  );
  els.help.showModal();
  if (!saved.seenHelp) {
    saved.seenHelp = true;
    saveState(saved);
  }
}

function openStats(): void {
  const s = saved.stats;
  const winPct = s.played ? Math.round((s.wins / s.played) * 100) : 0;
  const maxBucket = Math.max(1, ...BUCKETS.map((b) => s.distribution[b] ?? 0));
  const todayBucket = isWon(dailyGame()) ? bucket(savedGuesses(today).length) : '';
  const stat = (value: string | number, label: string) =>
    h('div', { class: 'stat' }, h('div', { class: 'stat__value' }, String(value)), h('div', { class: 'stat__label' }, label));

  els.stats.replaceChildren(
    closeButton(els.stats),
    h('h2', { id: 'stats-title' }, 'Statistics'),
    h('div', { class: 'stats__row' },
      stat(s.played, 'Played'),
      stat(winPct, 'Win %'),
      stat(displayStreak(s, today), 'Streak'),
      stat(s.maxStreak, 'Best streak'),
    ),
    h('h3', {}, 'Guesses to solve'),
    h('div', { class: 'dist' },
      ...BUCKETS.map((b) => {
        const count = s.distribution[b] ?? 0;
        const bar = h('div', { class: `dist__bar${b === todayBucket ? ' dist__bar--today' : ''}` }, String(count));
        bar.style.width = `${Math.max(8, (count / maxBucket) * 100)}%`;
        return h('div', { class: 'dist__row' }, h('span', { class: 'dist__label' }, b), bar);
      }),
    ),
  );
  if (s.played === 0) els.stats.append(h('p', { class: 'muted' }, 'Play a daily round to start your stats.'));
  els.stats.showModal();
}

/**
 * Browsable list of every guessable term, names only (showing traits would make it a cheat sheet).
 * Clicking a name puts it in the input; the player still confirms the guess.
 */
function openTerms(): void {
  track('browse-terms');
  const guessed = guessedIds();
  const sorted = [...TERMS].sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
  const firstChar = (name: string) => {
    const c = normalize(name).charAt(0).toUpperCase();
    return /[A-Z]/.test(c) ? c : '#';
  };

  const filter = h('input', {
    class: 'guess__input terms__filter',
    type: 'search',
    placeholder: 'Filter terms…',
    'aria-label': 'Filter terms',
    autocomplete: 'off',
    spellcheck: 'false',
  });
  const list = h('div', { class: 'terms__list' });
  const empty = h('p', { class: 'muted', hidden: '' }, 'No term matches that.');

  const renderList = () => {
    const matches = new Set(findMatches(TERMS, filter.value, new Set(), TERMS.length).map((t) => t.id));
    const shown = filter.value.trim() ? sorted.filter((t) => matches.has(t.id)) : sorted;
    empty.hidden = shown.length > 0;
    const groups = new Map<string, Term[]>();
    for (const t of shown) {
      const key = firstChar(t.name);
      groups.set(key, [...(groups.get(key) ?? []), t]);
    }
    list.replaceChildren(
      ...[...groups].map(([letter, group]) =>
        h('section', { class: 'terms__group' },
          h('h3', { class: 'terms__letter' }, letter),
          h('ul', {},
            ...group.map((t) => {
              const done = guessed.has(t.id);
              const b = h('button', { class: `terms__item${done ? ' terms__item--guessed' : ''}`, type: 'button' }, t.name);
              if (done) {
                b.disabled = true;
                b.title = 'Already guessed';
              } else {
                b.addEventListener('click', () => {
                  els.terms.close();
                  if (isOver(game)) return;
                  els.input.value = t.name;
                  els.input.focus();
                  updateSuggestions();
                });
              }
              return h('li', {}, b);
            }),
          ),
        ),
      ),
    );
  };
  filter.addEventListener('input', renderList);
  renderList();

  els.terms.replaceChildren(
    closeButton(els.terms),
    h('h2', { id: 'terms-title' }, `All ${TERMS.length} terms`),
    h('p', { class: 'muted' }, isOver(game)
      ? 'Every term you can guess in AIMLdle.'
      : 'Tap a term to put it in the guess box, then press Guess. Crossed-out terms are already on your board.'),
    filter,
    empty,
    list,
  );
  els.terms.showModal();
  filter.focus();
}

/** Past puzzle numbers, newest first. */
function archivePuzzles(): number[] {
  return Array.from({ length: Math.max(0, today - 1) }, (_, i) => today - 1 - i);
}

function unplayedArchive(): number[] {
  return archivePuzzles().filter((p) => !isOver(puzzleGame(p)));
}

function openArchive(): void {
  const puzzles = archivePuzzles();
  const solved = puzzles.filter((p) => isWon(puzzleGame(p))).length;
  const items = puzzles.map((p) => {
    const g = puzzleGame(p);
    const n = g.guesses.length;
    const [status, cls] = isWon(g)
      ? [`✓ ${n} ${n === 1 ? 'guess' : 'guesses'}`, 'archive__status--won']
      : g.gaveUp
        ? ['✗ Gave up', 'archive__status--gaveup']
        : n > 0
        ? [`${n} tried`, 'archive__status--started']
        : ['Not played', ''];
    const item = h('button', { class: 'archive__item', type: 'button' },
      h('span', { class: 'archive__num' }, `#${p}`),
      h('span', { class: 'archive__date' }, formatPuzzleDate(p)),
      h('span', { class: `archive__status ${cls}` }, status),
    );
    item.addEventListener('click', () => {
      els.archive.close();
      track('archive-play');
      switchGame(puzzleGame(p));
    });
    return h('li', {}, item);
  });

  els.archive.replaceChildren(
    closeButton(els.archive),
    h('h2', { id: 'archive-title' }, 'Past days'),
    puzzles.length
      ? h('p', { class: 'muted' }, `${solved} of ${puzzles.length} solved. Archive games don't affect your stats or streak.`)
      : h('p', { class: 'muted' }, 'No past days yet. Come back tomorrow!'),
    h('ul', { class: 'archive__list' }, ...items),
  );
  els.archive.showModal();
}

function link(href: string, text: string): HTMLAnchorElement {
  return h('a', { href, target: '_blank', rel: 'noopener' }, text);
}

function openAbout(): void {
  const verified = TERMS.filter((t) => !t.verify).length;
  els.about.replaceChildren(
    closeButton(els.about),
    h('h2', { id: 'about-title' }, 'About AIMLdle'),
    h('p', {},
      'AIMLdle started as a way to practise the topics in StatQuest\'s ',
      link('https://youtube.com/playlist?list=PLblh5JKOoLUICTaGLRoHQDuF_7q2GfuJF', 'Machine Learning playlist'),
      ', one term per video. It then grew to cover deep learning, generative AI, reinforcement learning, LLMs and the tools people use every day.',
    ),
    h('h3', {}, 'The terms'),
    h('ul', { class: 'about__list' },
      h('li', {}, `${TERMS.length} terms, from 17th-century calculus to today's LLMs.`),
      h('li', {}, 'Every term is written by hand with a source (the paper or book behind its year and field). No AI is used while you play.'),
      h('li', {}, `${verified} of ${TERMS.length} terms are fully checked; the rest have debatable origin years and are still being verified.`),
    ),
    h('h3', {}, 'Credits'),
    h('p', {}, 'Idea and testing by Mootez Kniss. Built with Claude Code.'),
    h('p', { class: 'muted' }, 'Topic list inspired by StatQuest with Josh Starmer. Not affiliated with StatQuest.'),
    h('p', { class: 'muted' },
      'Privacy: anonymous visit and game counts (e.g. "a puzzle was solved") via ',
      link('https://www.goatcounter.com', 'GoatCounter'),
      '. No cookies, no personal data. Your progress stays in your own browser.'),
    h('p', { class: 'muted' }, '© 2026 Mootez Kniss. All rights reserved.'),
  );
  els.about.showModal();
}

// Close a dialog when clicking the backdrop.
for (const dialog of [els.help, els.stats, els.about, els.archive, els.terms]) {
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
}
$('help-btn').addEventListener('click', openHelp);
$('stats-btn').addEventListener('click', openStats);
$('about-btn').addEventListener('click', openAbout);
$('archive-btn').addEventListener('click', openArchive);
els.browse.title = `Browse all ${TERMS.length} terms`;
els.browse.addEventListener('click', openTerms);

// ---------- Start ----------

$('legend').replaceChildren(...legendItems('span', 'legend__item'));

render();
if (!saved.seenHelp) openHelp();
