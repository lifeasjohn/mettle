import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { concepts, lessons } from '../../src/content';
import { isLessonAvailable } from '../../src/domain';
import { useSeenConceptIds } from '../../src/state/hooks';
import { useMettle } from '../../src/state/store';
import { palette, radius, spacing, virtueColor, virtueLabel } from '../../src/theme/tokens';
import { Card, Screen, Text } from '../../src/ui';

/**
 * Train holds the five-lesson ramp and the concept library.
 *
 * The library is the reason just-in-time delivery feels like collecting rather
 * than interrupting: every concept the Arena surfaces at the moment of failure
 * lands here permanently, so the locked ones read as territory to take.
 */
export default function Train() {
  const router = useRouter();
  const progress = useMettle((s) => s.lessonProgress);
  const seen = useSeenConceptIds();

  const done = new Set(progress.map((p) => p.lessonId));
  const unlockedConcepts = concepts.filter((c) => seen.has(c.id));
  const lockedCount = concepts.length - unlockedConcepts.length;

  return (
    <Screen scroll>
      <View style={styles.head}>
        <Text variant="micro" tone="ember" caps>
          Train
        </Text>
        <Text variant="display" style={{ marginTop: 2 }}>
          Foundations
        </Text>
        <Text variant="body" tone="secondary" style={{ marginTop: spacing.sm }}>
          Five lessons. The rest of the concepts arrive when the Arena catches you missing one.
        </Text>
      </View>

      {lessons.map((lesson) => {
        const complete = done.has(lesson.id);
        const available = isLessonAvailable(lesson.id, progress);
        return (
          <Card
            key={lesson.id}
            muted={!available}
            accent={available && !complete}
            style={styles.lesson}
            onPress={available ? () => router.push(`/lesson/${lesson.id}`) : undefined}
          >
            <View style={styles.lessonRow}>
              <View style={[styles.num, complete && styles.numDone]}>
                <Text variant="caption" color={complete ? palette.void : palette.ember}>
                  {complete ? '✓' : lesson.order}
                </Text>
              </View>
              <View style={styles.flex1}>
                <Text variant="bodyStrong">{lesson.title}</Text>
                <Text variant="caption" tone="faint" style={{ marginTop: 2 }}>
                  {lesson.subtitle}
                </Text>
              </View>
              <View style={[styles.virtueDot, { backgroundColor: virtueColor[lesson.virtue] }]} />
            </View>
          </Card>
        );
      })}

      <Text variant="micro" tone="faint" caps style={styles.sectionLabel}>
        Concept library · {unlockedConcepts.length} of {concepts.length}
      </Text>

      {unlockedConcepts.map((c) => (
        <Card key={c.id} style={styles.concept}>
          <View style={styles.conceptTop}>
            <Text variant="bodyStrong">{c.name}</Text>
            <Text variant="micro" caps color={virtueColor[c.virtue]}>
              {virtueLabel[c.virtue]}
            </Text>
          </View>
          <Text variant="caption" tone="secondary" style={{ marginTop: spacing.xs }}>
            {c.summary}
          </Text>
        </Card>
      ))}

      {lockedCount > 0 ? (
        <Card muted style={styles.concept}>
          <Text variant="bodyStrong">{lockedCount} still locked</Text>
          <Text variant="caption" tone="secondary" style={{ marginTop: spacing.xs }}>
            These arrive in the Arena, at the moment you need them. Not on a schedule.
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { paddingTop: spacing.base, paddingBottom: spacing.lg },
  flex1: { flex: 1 },
  lesson: { marginBottom: spacing.sm },
  lessonRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  num: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.emberDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numDone: { backgroundColor: palette.ember, borderColor: palette.ember },
  virtueDot: { width: 8, height: 8, borderRadius: radius.pill, opacity: 0.7 },
  sectionLabel: { marginTop: spacing.xl, marginBottom: spacing.sm },
  concept: { marginBottom: spacing.sm },
  conceptTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
