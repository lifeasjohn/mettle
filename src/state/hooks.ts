import { useMemo } from 'react';
import { lessonById } from '../content';
import {
  analysePatterns,
  computeRadar,
  computeStreak,
  computeUnlocks,
  type DayActivity,
  type PatternReport,
  type StreakState,
  type UnlockState,
  type VirtueScores,
} from '../domain';
import { useMettle } from './store';

/**
 * Derived state, as memoised hooks rather than store selectors.
 *
 * This is not a style preference. zustand subscribes through
 * useSyncExternalStore, which requires the snapshot to be referentially stable.
 * A selector that computes `computeStreak(...)` returns a fresh object on every
 * call, so React sees the store as perpetually changed and re-renders forever.
 * It typechecks, it bundles, and it renders a blank screen.
 *
 * The fix is to select only the stored arrays (which are replaced solely on
 * write, so their identity is stable) and derive from them inside useMemo.
 */

function useSources() {
  const lessonProgress = useMettle((s) => s.lessonProgress);
  const spars = useMettle((s) => s.spars);
  const quenchEntries = useMettle((s) => s.quenchEntries);
  return { lessonProgress, spars, quenchEntries };
}

export function useDayActivity(): DayActivity[] {
  const { lessonProgress, spars, quenchEntries } = useSources();
  return useMemo(() => {
    const dates = new Set<string>([
      ...lessonProgress.map((p) => p.date),
      ...spars.map((s) => s.date),
      ...quenchEntries.map((q) => q.date),
    ]);
    return [...dates].map((date) => ({
      date,
      kinds: [
        ...(lessonProgress.some((p) => p.date === date) ? (['lesson'] as const) : []),
        ...(spars.some((s) => s.date === date) ? (['spar'] as const) : []),
        ...(quenchEntries.some((q) => q.date === date) ? (['quench'] as const) : []),
      ],
    }));
  }, [lessonProgress, spars, quenchEntries]);
}

export function useStreak(): StreakState {
  const days = useDayActivity();
  return useMemo(() => computeStreak(days), [days]);
}

export function useUnlocks(): UnlockState {
  const lessonProgress = useMettle((s) => s.lessonProgress);
  return useMemo(() => computeUnlocks(lessonProgress), [lessonProgress]);
}

export function useRadar(): VirtueScores {
  const { lessonProgress, spars, quenchEntries } = useSources();
  return useMemo(
    () => computeRadar({ spars, quench: quenchEntries, lessons: lessonProgress }),
    [spars, quenchEntries, lessonProgress],
  );
}

export function usePattern(): PatternReport {
  const spars = useMettle((s) => s.spars);
  const quenchEntries = useMettle((s) => s.quenchEntries);
  return useMemo(() => analysePatterns(quenchEntries, spars), [quenchEntries, spars]);
}

/** Concepts already shown, by lesson or by just-in-time delivery. */
export function useSeenConceptIds(): Set<string> {
  const lessonProgress = useMettle((s) => s.lessonProgress);
  const delivered = useMettle((s) => s.deliveredConcepts);
  return useMemo(() => {
    const seen = new Set(delivered);
    for (const p of lessonProgress) {
      for (const c of lessonById.get(p.lessonId)?.teaches ?? []) seen.add(c);
    }
    return seen;
  }, [lessonProgress, delivered]);
}

export function useSeenScenarioIds(): Set<string> {
  const spars = useMettle((s) => s.spars);
  return useMemo(() => new Set(spars.map((s) => s.scenarioId)), [spars]);
}
