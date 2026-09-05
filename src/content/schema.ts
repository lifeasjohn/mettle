import { z } from 'zod';

/**
 * Content schemas. Every JSON file under src/content is parsed through these at
 * module load, so a malformed lesson fails loudly at startup and in CI rather
 * than rendering a blank card to a user.
 *
 * No react-native imports here: this file is unit tested in plain node.
 */

export const strugglePaths = ['anger', 'anxiety', 'distraction', 'discipline'] as const;
export const StrugglePath = z.enum(strugglePaths);
export type StrugglePath = z.infer<typeof StrugglePath>;

export const virtues = ['wisdom', 'courage', 'temperance', 'justice'] as const;
export const Virtue = z.enum(virtues);
export type Virtue = z.infer<typeof Virtue>;

export const verdicts = ['tempered', 'bending', 'brittle'] as const;
export const Verdict = z.enum(verdicts);
export type Verdict = z.infer<typeof Verdict>;

/** Every struggle path must be present. Hook cards have no fallback by design. */
const byPath = <T extends z.ZodTypeAny>(inner: T) =>
  z.object({
    anger: inner,
    anxiety: inner,
    distraction: inner,
    discipline: inner,
  });

// ---------------------------------------------------------------------------
// Concepts
// ---------------------------------------------------------------------------

/**
 * A concept is the atom of the whole product. Lessons teach five of them,
 * scenarios are scored against them, and the remaining ten are delivered
 * just-in-time when a verdict shows the user missing one.
 */
export const Concept = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  virtue: Virtue,
  /** One sentence. Shown on the concept card and used in scoring prompts. */
  summary: z.string().min(1),
  /** The teaching body of a just-in-time card. Kept short: this interrupts a flow. */
  body: z.string().min(1),
  quote: z.object({ text: z.string().min(1), attribution: z.string().min(1) }).optional(),
  /** True when a lesson teaches it. False means it only ever appears just-in-time. */
  taughtInLesson: z.boolean(),
});
export type Concept = z.infer<typeof Concept>;

export const ConceptFile = z.array(Concept).min(1);

// ---------------------------------------------------------------------------
// Lesson cards
// ---------------------------------------------------------------------------

const CardBase = z.object({ id: z.string().min(1) });

/** Opens the lesson with a felt situation. The only path-varying card. */
export const HookCard = CardBase.extend({
  type: z.literal('hook'),
  variants: byPath(z.string().min(1)),
});

export const ConceptCard = CardBase.extend({
  type: z.literal('concept'),
  heading: z.string().min(1),
  body: z.string().min(1),
  /** A quote is always followed by its plain-language translation, never left alone. */
  quote: z
    .object({
      text: z.string().min(1),
      attribution: z.string().min(1),
      translation: z.string().min(1),
    })
    .optional(),
});

const Option = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  correct: z.boolean(),
  /** Shown whether right or wrong. One line, corrective not punitive. */
  feedback: z.string().min(1),
});

export const SingleChoiceCard = CardBase.extend({
  type: z.literal('check'),
  interaction: z.literal('single_choice'),
  prompt: z.string().min(1),
  options: z.array(Option).min(2),
});

export const SortCard = CardBase.extend({
  type: z.literal('check'),
  interaction: z.literal('sort'),
  prompt: z.string().min(1),
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        text: z.string().min(1),
        bucket: z.enum(['control', 'not_control']),
      }),
    )
    .min(4),
});

/** A mini-scenario with instant feedback. The closest a lesson gets to the Arena. */
export const RepCard = CardBase.extend({
  type: z.literal('rep'),
  scenario: z.string().min(1),
  options: z.array(Option).min(3),
});

/** Sets today's intention. Exactly one per lesson, always last. */
export const CarryCard = CardBase.extend({
  type: z.literal('carry'),
  prompt: z.string().min(1),
  intentions: z.array(z.string().min(1)).min(3),
});

/**
 * Both check variants share `type: 'check'`, so they discriminate on
 * `interaction` in a nested union. A flat union on `type` is rejected outright
 * for the duplicate discriminator value.
 */
export const CheckCard = z.discriminatedUnion('interaction', [SingleChoiceCard, SortCard]);

export const LessonCard = z.discriminatedUnion('type', [
  HookCard,
  ConceptCard,
  CheckCard,
  RepCard,
  CarryCard,
]);
export type LessonCard = z.infer<typeof LessonCard>;

export const Lesson = z.object({
  id: z.string().min(1),
  order: z.number().int().positive(),
  title: z.string().min(1),
  /** Shown on the Train tab under the title. */
  subtitle: z.string().min(1),
  virtue: Virtue,
  /** Concepts this lesson teaches. Marks them as seen for just-in-time purposes. */
  teaches: z.array(z.string().min(1)).min(1),
  cards: z.array(LessonCard).min(4),
});
export type Lesson = z.infer<typeof Lesson>;

// ---------------------------------------------------------------------------
// Arena
// ---------------------------------------------------------------------------

/**
 * Escalation copy for rounds 2 and 3. `{{answer}}` is replaced with the user's
 * previous response so the pressure uses their own words against them. These are
 * the offline fallback; the arena-escalate edge function writes bespoke ones.
 */
export const Escalation = z.object({ template: z.string().min(1) });

export const Scenario = z.object({
  id: z.string().min(1),
  path: StrugglePath,
  virtue: Virtue,
  /** One or two concept ids. Scoring evaluates against these and nothing else. */
  targetConcepts: z.array(z.string().min(1)).min(1).max(2),
  /** Round 1. Second person, present tense, concrete. */
  opening: z.string().min(1),
  /** The gut-reaction chips shown before the user writes anything. */
  instinctOptions: z.array(z.string().min(1)).min(3).max(4),
  /** Exactly two: round 2 and round 3. */
  escalations: z.tuple([Escalation, Escalation]),
  /** Shown after the verdict. A grade with no model to copy teaches nothing. */
  referenceAnswer: z.string().min(1),
  /** Seeds the anonymous peer pool before real Tempered responses exist. */
  exemplars: z.array(z.string().min(1)).min(1),
});
export type Scenario = z.infer<typeof Scenario>;

export const ScenarioFile = z.array(Scenario).min(1);

/**
 * Tier 2 supply. Archetypes crossed with slot banks produce concrete scenarios
 * with no inference call, covering the gap between the seed pool running out and
 * the generator being worth invoking.
 */
export const ScenarioTemplate = z.object({
  id: z.string().min(1),
  path: StrugglePath,
  virtue: Virtue,
  targetConcepts: z.array(z.string().min(1)).min(1).max(2),
  /** Contains `{{slot}}` markers matching keys in `slots`. */
  openingTemplate: z.string().min(1),
  slots: z.record(z.string(), z.array(z.string().min(1)).min(2)),
  instinctOptions: z.array(z.string().min(1)).min(3).max(4),
  escalations: z.tuple([Escalation, Escalation]),
  referenceAnswer: z.string().min(1),
  exemplars: z.array(z.string().min(1)).min(1),
});
export type ScenarioTemplate = z.infer<typeof ScenarioTemplate>;

export const ScenarioTemplateFile = z.array(ScenarioTemplate).min(1);

// ---------------------------------------------------------------------------
// Quench
// ---------------------------------------------------------------------------

/**
 * Quench chips are the only structured record of what happened outside the app,
 * so each one carries the virtue it credits and a trigger tag that The Pattern
 * groups by. Getting these tags right matters more than the copy.
 */
export const QuenchChip = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  /** 'held' chips credit a virtue. 'ran' chips are diagnostic and credit nothing. */
  kind: z.enum(['held', 'ran']),
  virtue: Virtue,
  /** Groups chips in The Pattern, e.g. several chips share 'took-personally'. */
  trigger: z.string().min(1),
});
export type QuenchChip = z.infer<typeof QuenchChip>;

export const QuenchChipFile = z.array(QuenchChip).min(2);
