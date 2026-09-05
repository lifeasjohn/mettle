import { describe, expect, it } from 'vitest';
import { selectJitConcept } from './jit-concepts';
import { buildSealLine } from './seal';
import { lessonDone, quench } from './test-support';
import { computeUnlocks, isLessonAvailable } from './unlocks';
import { levelFor, lessonXp, multiActivityBonus, sparXp } from './xp';

describe('unlocks', () => {
  it('opens the Arena after one lesson, not five', () => {
    expect(computeUnlocks([]).arenaUnlocked).toBe(false);
    expect(computeUnlocks([lessonDone('2026-03-01', 'lesson-1')]).arenaUnlocked).toBe(true);
  });

  it('walks the user through lessons in order', () => {
    expect(computeUnlocks([]).nextLessonId).toBe('lesson-1');
    expect(computeUnlocks([lessonDone('2026-03-01', 'lesson-1')]).nextLessonId).toBe('lesson-2');
  });

  it('reports when the ramp is finished', () => {
    const all = ['lesson-1', 'lesson-2', 'lesson-3', 'lesson-4', 'lesson-5'].map((id) =>
      lessonDone('2026-03-01', id),
    );
    expect(computeUnlocks(all)).toMatchObject({ allLessonsComplete: true, nextLessonId: null });
  });

  it('gates a later lesson behind its predecessors', () => {
    expect(isLessonAvailable('lesson-3', [])).toBe(false);
    expect(isLessonAvailable('lesson-1', [])).toBe(true);
  });
});

describe('xp', () => {
  it('rewards a perfect lesson without making a normal one feel worthless', () => {
    expect(lessonXp(false)).toBe(20);
    expect(lessonXp(true)).toBe(30);
  });

  it('still credits a brittle spar, because showing up is the rep', () => {
    expect(sparXp('brittle')).toBeGreaterThan(0);
    expect(sparXp('tempered')).toBeGreaterThan(sparXp('brittle'));
  });

  it('bonuses two distinct activities in a day, not two of the same', () => {
    expect(multiActivityBonus(['lesson'])).toBe(0);
    expect(multiActivityBonus(['spar', 'spar'])).toBe(0);
    expect(multiActivityBonus(['lesson', 'quench'])).toBeGreaterThan(0);
  });

  it('widens levels as they go', () => {
    expect(levelFor(0).level).toBe(1);
    expect(levelFor(100).level).toBe(2);
    const early = levelFor(0).needed;
    const later = levelFor(5000).needed;
    expect(later).toBeGreaterThan(early);
  });
});

describe('just-in-time concepts', () => {
  const base = { targetConcepts: ['not-taking-offense'], virtue: 'temperance' } as const;

  it('stays quiet on a tempered verdict', () => {
    expect(selectJitConcept({ ...base, verdict: 'tempered' }, new Set())).toBeNull();
  });

  it('teaches the concept that was actually missed', () => {
    const d = selectJitConcept({ ...base, verdict: 'brittle' }, new Set());
    expect(d?.concept.id).toBe('not-taking-offense');
    expect(d?.reason).toBe('missed-target');
  });

  it('does not re-teach something already seen', () => {
    const d = selectJitConcept({ ...base, verdict: 'bending' }, new Set(['not-taking-offense']));
    expect(d?.concept.id).not.toBe('not-taking-offense');
    expect(d?.reason).toBe('weak-area');
  });

  it('never offers a concept a lesson already teaches', () => {
    const d = selectJitConcept(
      { verdict: 'brittle', targetConcepts: ['dichotomy-of-control'], virtue: 'wisdom' },
      new Set(),
    );
    expect(d?.concept.taughtInLesson).not.toBe(true);
  });
});

describe('the seal', () => {
  it('names a repeated hold as tempering', () => {
    const history = ['2026-03-08', '2026-03-09'].map((d) =>
      quench(d, { heldChipIds: ['held-paused'] }),
    );
    const line = buildSealLine({
      entry: quench('2026-03-10', { heldChipIds: ['held-paused'] }),
      history,
      currentStreak: 3,
    });
    expect(line).toContain('Third day this week');
    expect(line).toContain('tempering');
  });

  it('names a repeated miss without turning it into a verdict on them', () => {
    const history = ['2026-03-08', '2026-03-09'].map((d) =>
      quench(d, { ranChipIds: ['ran-personally'] }),
    );
    const line = buildSealLine({
      entry: quench('2026-03-10', { ranChipIds: ['ran-personally'] }),
      history,
      currentStreak: 3,
    });
    expect(line).toContain('Not a failure');
  });

  it('always closes with something, even on an empty entry', () => {
    expect(buildSealLine({ entry: quench('2026-03-10'), history: [], currentStreak: 0 })).toBeTruthy();
  });
});
