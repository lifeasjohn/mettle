/**
 * Analytics.
 *
 * A named event union rather than free-form strings, so the funnel is defined
 * in one place and a typo cannot silently create a new event that nobody
 * queries. The sink is deliberately a no-op console logger: wiring a vendor is
 * a decision that needs a privacy review, and the call sites should already be
 * in the right places when that happens.
 *
 * Never log free text. Chip ids, verdicts and counts are fine; what someone
 * wrote in the Arena or the Quench is not, and must never leave the device
 * through this path.
 */

export type AnalyticsEvent =
  | { name: 'onboarding_step'; step: string; index: number }
  | { name: 'onboarding_complete'; path: string; minutes: number }
  | { name: 'lesson_start'; lessonId: string }
  | { name: 'lesson_complete'; lessonId: string; perfect: boolean }
  | { name: 'spar_start'; scenarioId: string; source: 'seed' | 'template' }
  | { name: 'spar_round'; round: number }
  | { name: 'spar_complete'; verdict: string; rounds: number }
  | { name: 'crisis_guardrail'; surface: 'arena' | 'quench'; layer: 1 | 2 }
  | { name: 'concept_delivered'; conceptId: string; reason: string }
  | { name: 'quench_complete'; heldCount: number; ranCount: number; hasContext: boolean }
  | { name: 'paywall_view'; sparsUsed: number }
  | { name: 'paywall_subscribe'; plan: 'annual' | 'weekly' }
  | { name: 'pattern_view'; insightCount: number }
  | { name: 'share_verdict'; verdict: string };

type Sink = (event: AnalyticsEvent) => void;

let sink: Sink = (event) => {
  if (__DEV__) console.log('[analytics]', event.name, event);
};

export function setAnalyticsSink(next: Sink): void {
  sink = next;
}

export function track(event: AnalyticsEvent): void {
  try {
    sink(event);
  } catch {
    // Analytics must never break a user flow.
  }
}
