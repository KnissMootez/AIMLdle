// Validates data/terms.json against the rules in data/ATTRIBUTES.md.
// Run: npm run validate   (exits with code 1 on any error)
//
// Node runs src/attributes.ts directly (built-in type stripping, Node 22.18+ / 23.6+).

import { readFileSync } from 'node:fs';
import {
  CATEGORIES,
  TASKS,
  LEARNING_TYPES,
  FIELDS,
  FAMILIES,
  DIFFICULTIES,
  EXCLUSIVE_VALUES,
  COLUMNS,
} from '../src/attributes.ts';

const FILE = new URL('../data/terms.json', import.meta.url);
const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const CURRENT_YEAR = new Date().getUTCFullYear();

const errors = [];
const warnings = [];

const normalize = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

let terms;
try {
  terms = JSON.parse(readFileSync(FILE, 'utf8'));
} catch (e) {
  console.error(`✗ Could not read/parse terms.json: ${e.message}`);
  process.exit(1);
}
if (!Array.isArray(terms)) {
  console.error('✗ terms.json must be an array');
  process.exit(1);
}

const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

function checkSingle(t, key, allowed) {
  if (!allowed.includes(t[key])) errors.push(`${t.id}: ${key} "${t[key]}" is not one of: ${allowed.join(', ')}`);
}

function checkMulti(t, key, allowed) {
  const v = t[key];
  if (!Array.isArray(v) || v.length === 0) {
    errors.push(`${t.id}: ${key} must be a non-empty array`);
    return;
  }
  for (const x of v) if (!allowed.includes(x)) errors.push(`${t.id}: ${key} value "${x}" is not allowed`);
  if (new Set(v).size !== v.length) errors.push(`${t.id}: ${key} has duplicate values`);
  for (const ex of EXCLUSIVE_VALUES) {
    if (v.includes(ex) && v.length > 1) errors.push(`${t.id}: ${key} "${ex}" must be used alone`);
  }
}

const REQUIRED = ['id', 'name', 'aliases', 'category', 'task', 'learningType', 'year', 'field',
  'family', 'difficulty', 'daily', 'explanation', 'source', 'verify'];

const ids = new Map();
const searchKeys = new Map(); // normalized name/alias -> id

for (const [i, t] of terms.entries()) {
  const label = t?.id ?? `#${i}`;
  for (const key of REQUIRED) if (!(key in t)) errors.push(`${label}: missing "${key}"`);
  for (const key of Object.keys(t)) if (!REQUIRED.includes(key)) warnings.push(`${label}: unknown field "${key}"`);

  if (!isNonEmptyString(t.id) || !ID_PATTERN.test(t.id)) errors.push(`${label}: id must be kebab-case`);
  if (ids.has(t.id)) errors.push(`${label}: duplicate id`);
  ids.set(t.id, t);

  if (!isNonEmptyString(t.name)) errors.push(`${label}: name is empty`);
  if (!Array.isArray(t.aliases)) errors.push(`${label}: aliases must be an array`);

  for (const key of [t.name, ...(t.aliases ?? [])]) {
    const n = normalize(String(key));
    if (!n) continue;
    const owner = searchKeys.get(n);
    if (owner && owner !== t.id) errors.push(`${label}: name/alias "${key}" clashes with ${owner}`);
    searchKeys.set(n, t.id);
  }

  checkSingle(t, 'category', CATEGORIES);
  checkMulti(t, 'task', TASKS);
  checkMulti(t, 'learningType', LEARNING_TYPES);
  checkSingle(t, 'field', FIELDS);
  checkSingle(t, 'family', FAMILIES);
  checkSingle(t, 'difficulty', DIFFICULTIES);

  if (!Number.isInteger(t.year) || t.year < 1600 || t.year > CURRENT_YEAR) {
    errors.push(`${label}: year ${t.year} must be an integer between 1600 and ${CURRENT_YEAR}`);
  }
  if (!isNonEmptyString(t.explanation)) errors.push(`${label}: explanation is empty`);
  if (!isNonEmptyString(t.source)) errors.push(`${label}: source is empty (every term needs one)`);
  if (typeof t.verify !== 'boolean') errors.push(`${label}: verify must be true or false`);
  if (typeof t.daily !== 'boolean') errors.push(`${label}: daily must be true or false`);

  // Rule from ATTRIBUTES.md: only Models and Techniques have a learning setting.
  const learning = t.learningType ?? [];
  const learns = t.category === 'Model' || t.category === 'Technique';
  if (!learns && !(learning.length === 1 && learning[0] === 'N/A')) {
    errors.push(`${label}: a ${t.category} must have learningType ["N/A"]`);
  }
}

// Two terms with identical attributes can't be told apart in the game.
const fingerprints = new Map();
for (const t of terms) {
  const fp = JSON.stringify(COLUMNS.map((c) => {
    const v = t[c.key];
    return Array.isArray(v) ? [...v].sort() : v;
  }));
  const other = fingerprints.get(fp);
  if (other) errors.push(`${t.id}: identical attributes to ${other} (players can't tell them apart)`);
  else fingerprints.set(fp, t.id);
}

const toVerify = terms.filter((t) => t.verify === true).map((t) => t.id);

for (const w of warnings) console.warn(`⚠ ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`✗ ${e}`);
  console.error(`\n${errors.length} error(s) in ${terms.length} terms.`);
  process.exit(1);
}
const dailyCount = terms.filter((t) => t.daily === true).length;
if (dailyCount < 60) {
  console.error(`✗ Only ${dailyCount} terms have "daily": true (need at least 60).`);
  process.exit(1);
}
console.log(`✓ ${terms.length} terms valid (${dailyCount} can be the daily answer).`);
if (toVerify.length) console.log(`  ${toVerify.length} still marked "verify": ${toVerify.join(', ')}`);
