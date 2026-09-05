import angerScenarios from './arena/anger.json';
import anxietyScenarios from './arena/anxiety.json';
import disciplineScenarios from './arena/discipline.json';
import distractionScenarios from './arena/distraction.json';
import rawTemplates from './arena/templates.json';
import rawConcepts from './concepts/concepts.json';
import lesson1 from './lessons/lesson-1.json';
import lesson2 from './lessons/lesson-2.json';
import lesson3 from './lessons/lesson-3.json';
import lesson4 from './lessons/lesson-4.json';
import lesson5 from './lessons/lesson-5.json';
import rawChips from './quench-chips.json';
import {
  Concept,
  ConceptFile,
  Lesson,
  QuenchChip,
  QuenchChipFile,
  Scenario,
  ScenarioFile,
  ScenarioTemplate,
  ScenarioTemplateFile,
  type StrugglePath,
} from './schema';

/**
 * Every content file is parsed through its schema here, at module load. A
 * malformed lesson therefore fails at app start and in CI, rather than
 * rendering an empty card to someone mid-session.
 *
 * Cross-file invariants (concept references resolving, ordering, coverage) are
 * asserted separately by scripts/validate-content.ts so they run in CI without
 * paying for them on every cold start.
 */

export const concepts: Concept[] = ConceptFile.parse(rawConcepts);

export const conceptById: ReadonlyMap<string, Concept> = new Map(
  concepts.map((c) => [c.id, c]),
);

/** The ten concepts no lesson teaches. These arrive only at the point of failure. */
export const justInTimeConcepts: Concept[] = concepts.filter((c) => !c.taughtInLesson);

export const lessons: Lesson[] = [lesson1, lesson2, lesson3, lesson4, lesson5]
  .map((l) => Lesson.parse(l))
  .sort((a, b) => a.order - b.order);

export const lessonById: ReadonlyMap<string, Lesson> = new Map(lessons.map((l) => [l.id, l]));

export const scenarios: Scenario[] = [
  ...ScenarioFile.parse(angerScenarios),
  ...ScenarioFile.parse(anxietyScenarios),
  ...ScenarioFile.parse(distractionScenarios),
  ...ScenarioFile.parse(disciplineScenarios),
];

export const scenarioById: ReadonlyMap<string, Scenario> = new Map(scenarios.map((s) => [s.id, s]));

export const scenariosByPath: Readonly<Record<StrugglePath, Scenario[]>> = {
  anger: scenarios.filter((s) => s.path === 'anger'),
  anxiety: scenarios.filter((s) => s.path === 'anxiety'),
  distraction: scenarios.filter((s) => s.path === 'distraction'),
  discipline: scenarios.filter((s) => s.path === 'discipline'),
};

export const scenarioTemplates: ScenarioTemplate[] = ScenarioTemplateFile.parse(rawTemplates);

export const templatesByPath: Readonly<Record<StrugglePath, ScenarioTemplate[]>> = {
  anger: scenarioTemplates.filter((t) => t.path === 'anger'),
  anxiety: scenarioTemplates.filter((t) => t.path === 'anxiety'),
  distraction: scenarioTemplates.filter((t) => t.path === 'distraction'),
  discipline: scenarioTemplates.filter((t) => t.path === 'discipline'),
};

export const quenchChips: QuenchChip[] = QuenchChipFile.parse(rawChips);

/** "Where did you hold the line today?" */
export const heldChips = quenchChips.filter((c) => c.kind === 'held');
/** "Where did a judgment run you?" Diagnostic only: these credit no virtue. */
export const ranChips = quenchChips.filter((c) => c.kind === 'ran');

export const chipById: ReadonlyMap<string, QuenchChip> = new Map(quenchChips.map((c) => [c.id, c]));

export * from './schema';
