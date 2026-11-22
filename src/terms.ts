import rawTerms from '../data/terms.json';
import type { Term } from './attributes.ts';

// JSON imports are typed loosely (string, not 'Model' | 'Metric' | ...).
// scripts/validate.js guarantees the values are allowed, so the cast is safe.
export const TERMS: readonly Term[] = rawTerms as Term[];

/** Terms that can be the daily or practice answer. All TERMS can be guessed. */
export const ANSWER_POOL: readonly Term[] = TERMS.filter((t) => t.daily);

export const TERMS_BY_ID: ReadonlyMap<string, Term> = new Map(TERMS.map((t) => [t.id, t]));
