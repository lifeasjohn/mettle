import { scenariosByPath, templatesByPath } from '../content';
import type { Scenario, ScenarioTemplate, StrugglePath } from '../content/schema';
import type { VirtueScores } from './radar';

/**
 * Scenario selection.
 *
 * Supply and adaptivity are the same mechanism here. Rather than serving the
 * next unseen scenario, selection biases toward the virtue the user has least
 * evidence for, so running low on content and getting harder at your weak spot
 * look identical from the inside.
 *
 * Three tiers, in order:
 *   1. hand-written seed scenarios (40, offline, free)
 *   2. templates crossed with slot banks (~547 combinations, offline, free)
 *   3. the arena-generate edge function, which the repository handles
 */

export type SelectedScenario =
  | { source: 'seed'; scenario: Scenario }
  | { source: 'template'; scenario: Scenario; templateId: string };

/** Small deterministic hash, so a given seed always composes the same scenario. */
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const pick = <T>(items: readonly T[], seed: string): T => items[hash(seed) % items.length]!;

export function composeFromTemplate(template: ScenarioTemplate, seed: string): Scenario {
  let opening = template.openingTemplate;
  for (const [slot, options] of Object.entries(template.slots)) {
    opening = opening.replaceAll(`{{${slot}}}`, pick(options, `${seed}:${slot}`));
  }

  return {
    id: `${template.id}:${hash(seed).toString(36)}`,
    path: template.path,
    virtue: template.virtue,
    targetConcepts: template.targetConcepts,
    opening,
    instinctOptions: template.instinctOptions,
    escalations: template.escalations,
    referenceAnswer: template.referenceAnswer,
    exemplars: template.exemplars,
  };
}

export interface SelectionInput {
  path: StrugglePath;
  /** Scenario ids already sparred, so the user never repeats one. */
  seenScenarioIds: ReadonlySet<string>;
  /** Current radar. Selection leans toward the thinnest virtue. */
  radar: VirtueScores;
  /** Stable per-selection seed, e.g. the date plus a counter. */
  seed: string;
}

export function selectScenario(input: SelectionInput): SelectedScenario {
  const unseen = scenariosByPath[input.path].filter((s) => !input.seenScenarioIds.has(s.id));

  if (unseen.length > 0) {
    // Prefer the weakest virtue, but only among scenarios that exist for it.
    const ranked = [...unseen].sort((a, b) => input.radar[a.virtue] - input.radar[b.virtue]);
    const weakest = input.radar[ranked[0]!.virtue];
    const tied = ranked.filter((s) => input.radar[s.virtue] === weakest);
    return { source: 'seed', scenario: pick(tied, input.seed) };
  }

  // Seeds exhausted for this path: compose one, still biased by weakness.
  const templates = templatesByPath[input.path];
  const ranked = [...templates].sort((a, b) => input.radar[a.virtue] - input.radar[b.virtue]);
  const template = ranked[0] ?? templates[0]!;
  return {
    source: 'template',
    scenario: composeFromTemplate(template, input.seed),
    templateId: template.id,
  };
}

/** Fills `{{answer}}` in an escalation with what the user actually just wrote. */
export function buildEscalation(template: string, previousAnswer: string): string {
  const trimmed = previousAnswer.trim();
  const quoted = trimmed.length > 220 ? `${trimmed.slice(0, 217)}...` : trimmed;
  return template.replaceAll('{{answer}}', quoted);
}
