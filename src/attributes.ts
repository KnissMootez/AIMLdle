// Single source of truth for allowed attribute values.
// Used by the game AND by scripts/validate.js, so this file must not import anything.
// Definitions of each value live in data/ATTRIBUTES.md.

export const CATEGORIES = [
  'Model',
  'Component',
  'Optimization',
  'Technique',
  'Metric',
  'Statistical test',
  'Concept',
  'Dataset',
  'Tool',
] as const;

export const TASKS = [
  'Classification',
  'Regression',
  'Clustering',
  'Dimensionality reduction',
  'Sequence modeling',
  'Generation',
  'Control',
  'Recommendation',
  'Evaluation',
  'General',
] as const;

export const LEARNING_TYPES = [
  'Supervised',
  'Unsupervised',
  'Self-supervised',
  'Reinforcement',
  'N/A',
] as const;

export const FIELDS = [
  'Statistics',
  'Mathematics',
  'Information theory',
  'Physics',
  'Computer science',
  'Industry lab',
] as const;

export const FAMILIES = ['Foundations', 'Classical ML', 'Deep learning', 'LLM era'] as const;

/** Ordered from easiest to hardest: the order matters for ↑ / ↓ feedback. */
export const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'] as const;

/** Values that must appear alone in a multi-value list. */
export const EXCLUSIVE_VALUES = ['General', 'N/A'] as const;

export type Category = (typeof CATEGORIES)[number];
export type Task = (typeof TASKS)[number];
export type LearningType = (typeof LEARNING_TYPES)[number];
export type Field = (typeof FIELDS)[number];
export type Family = (typeof FAMILIES)[number];
export type Difficulty = (typeof DIFFICULTIES)[number];

export interface Term {
  id: string;
  name: string;
  aliases: string[];
  category: Category;
  task: Task[];
  learningType: LearningType[];
  year: number;
  field: Field;
  family: Family;
  difficulty: Difficulty;
  /** true = can be the daily/practice answer (well-known core); false = guess-only. */
  daily: boolean;
  explanation: string;
  source: string;
  verify: boolean;
}

export type ColumnKind = 'single' | 'multi' | 'number' | 'ordinal';

export interface Column {
  key: 'category' | 'task' | 'learningType' | 'year' | 'field' | 'family' | 'difficulty';
  label: string;
  kind: ColumnKind;
}

/** The attribute columns in the order they're shown on screen. */
export const COLUMNS: readonly Column[] = [
  { key: 'category', label: 'Category', kind: 'single' },
  { key: 'task', label: 'Task', kind: 'multi' },
  { key: 'learningType', label: 'Learning', kind: 'multi' },
  { key: 'year', label: 'Year', kind: 'number' },
  { key: 'field', label: 'Field', kind: 'single' },
  { key: 'family', label: 'Family', kind: 'single' },
  { key: 'difficulty', label: 'Difficulty', kind: 'ordinal' },
];
