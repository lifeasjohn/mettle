/**
 * Cross-file content invariants.
 *
 * Schema shape is enforced at import time by src/content/index.ts. This script
 * checks the things a schema cannot see: that concept references resolve, that
 * lesson ordering is sane, that every just-in-time concept is reachable, and
 * that scenario supply is actually balanced across the four struggle paths.
 *
 * Run with `npm run validate:content`.
 */
import {
  conceptById,
  concepts,
  heldChips,
  lessons,
  quenchChips,
  ranChips,
  scenarioTemplates,
  scenarios,
  scenariosByPath,
  strugglePaths,
  templatesByPath,
} from '../src/content';

const problems: string[] = [];
const fail = (msg: string) => problems.push(msg);

// --- concepts ---------------------------------------------------------------
const conceptIds = new Set(concepts.map((c) => c.id));
if (conceptIds.size !== concepts.length) fail('concept ids are not unique');

const taught = concepts.filter((c) => c.taughtInLesson).map((c) => c.id);
const jit = concepts.filter((c) => !c.taughtInLesson);
if (jit.length === 0) fail('no just-in-time concepts: the point-of-failure teaching has nothing to deliver');

// --- lessons ----------------------------------------------------------------
lessons.forEach((lesson, i) => {
  if (lesson.order !== i + 1) fail(`${lesson.id}: order ${lesson.order} is not contiguous (expected ${i + 1})`);

  const types = lesson.cards.map((c) => c.type);
  if (types[0] !== 'hook') fail(`${lesson.id}: first card must be a hook`);
  if (types[types.length - 1] !== 'carry') fail(`${lesson.id}: last card must be the carry`);
  if (types.filter((t) => t === 'carry').length !== 1) {
    fail(`${lesson.id}: must have exactly one carry card (the day's intention)`);
  }
  if (lesson.cards.length < 4 || lesson.cards.length > 8) {
    fail(`${lesson.id}: ${lesson.cards.length} cards, outside the 4-8 range a lesson must fit in`);
  }

  const cardIds = lesson.cards.map((c) => c.id);
  if (new Set(cardIds).size !== cardIds.length) fail(`${lesson.id}: duplicate card ids`);

  for (const id of lesson.teaches) {
    if (!conceptById.has(id)) fail(`${lesson.id}: teaches unknown concept "${id}"`);
    else if (!conceptById.get(id)!.taughtInLesson) {
      fail(`${lesson.id}: teaches "${id}", but that concept is flagged just-in-time`);
    }
  }

  for (const card of lesson.cards) {
    if (card.type === 'check' && card.interaction === 'single_choice') {
      const correct = card.options.filter((o) => o.correct).length;
      if (correct !== 1) fail(`${lesson.id}/${card.id}: ${correct} correct options, expected exactly 1`);
    }
    if (card.type === 'rep') {
      const correct = card.options.filter((o) => o.correct).length;
      if (correct !== 1) fail(`${lesson.id}/${card.id}: ${correct} correct options, expected exactly 1`);
    }
    if (card.type === 'check' && card.interaction === 'sort') {
      for (const bucket of ['control', 'not_control'] as const) {
        if (!card.items.some((i) => i.bucket === bucket)) {
          fail(`${lesson.id}/${card.id}: sort card has no "${bucket}" items`);
        }
      }
    }
  }
});

// Every concept a lesson claims to teach must actually be claimed by some lesson.
const taughtByLessons = new Set(lessons.flatMap((l) => l.teaches));
for (const id of taught) {
  if (!taughtByLessons.has(id)) fail(`concept "${id}" is flagged taughtInLesson but no lesson teaches it`);
}

// --- scenarios --------------------------------------------------------------
const scenarioIds = new Set(scenarios.map((s) => s.id));
if (scenarioIds.size !== scenarios.length) fail('scenario ids are not unique');

for (const s of scenarios) {
  for (const id of s.targetConcepts) {
    if (!conceptById.has(id)) fail(`${s.id}: targets unknown concept "${id}"`);
  }
  if (!s.escalations[0].template.includes('{{answer}}')) {
    fail(`${s.id}: round 2 escalation does not use {{answer}}, so the pressure will not compound`);
  }
  if (s.opening.length < 40) fail(`${s.id}: opening is too short to be a real situation`);
}

for (const path of strugglePaths) {
  const count = scenariosByPath[path].length;
  if (count < 8) fail(`path "${path}" has only ${count} seed scenarios; the free tier can exhaust it`);
  if (templatesByPath[path].length === 0) fail(`path "${path}" has no tier-2 templates to fall back on`);
}

// Every just-in-time concept must be reachable, or it can never be delivered.
const targeted = new Set([
  ...scenarios.flatMap((s) => s.targetConcepts),
  ...scenarioTemplates.flatMap((t) => t.targetConcepts),
]);
for (const c of jit) {
  if (!targeted.has(c.id)) {
    fail(`just-in-time concept "${c.id}" is targeted by no scenario, so it can never be delivered`);
  }
}

// --- templates --------------------------------------------------------------
for (const t of scenarioTemplates) {
  const used = new Set([...t.openingTemplate.matchAll(/{{(\w+)}}/g)].map((m) => m[1]!));
  const declared = new Set(Object.keys(t.slots));
  for (const slot of used) if (!declared.has(slot)) fail(`${t.id}: uses undeclared slot "${slot}"`);
  for (const slot of declared) if (!used.has(slot)) fail(`${t.id}: declares unused slot "${slot}"`);
  for (const id of t.targetConcepts) {
    if (!conceptById.has(id)) fail(`${t.id}: targets unknown concept "${id}"`);
  }
}

// --- quench chips -----------------------------------------------------------
const chipIds = new Set(quenchChips.map((c) => c.id));
if (chipIds.size !== quenchChips.length) fail('quench chip ids are not unique');
if (heldChips.length < 3) fail('not enough "held the line" chips');
if (ranChips.length < 3) fail('not enough "a judgment ran me" chips');

// --- report -----------------------------------------------------------------
const combos = scenarioTemplates.reduce(
  (sum, t) => sum + Object.values(t.slots).reduce((n, v) => n * v.length, 1),
  0,
);

if (problems.length > 0) {
  console.error(`\n${problems.length} content problem(s):\n`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

console.log('Content OK');
console.log(`  concepts          ${concepts.length} (${taught.length} taught, ${jit.length} just-in-time)`);
console.log(`  lessons           ${lessons.length}`);
console.log(`  seed scenarios    ${scenarios.length} (${strugglePaths.map((p) => `${p}:${scenariosByPath[p].length}`).join(', ')})`);
console.log(`  templates         ${scenarioTemplates.length}, ~${combos.toLocaleString()} tier-2 combinations`);
console.log(`  quench chips      ${quenchChips.length} (${heldChips.length} held, ${ranChips.length} ran)`);
