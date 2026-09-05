import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { lessonById } from '../../src/content';
import { canSpar, levelFor, todayISO } from '../../src/domain';
import { PATH_NOUN } from '../../src/features/onboarding/steps';
import { useStreak, useUnlocks } from '../../src/state/hooks';
import {
  selectQuenchDoneToday,
  selectTodayIntention,
  selectTotalXp,
  useMettle,
} from '../../src/state/store';
import { palette, radius, spacing } from '../../src/theme/tokens';
import { Button, Card, Flame, Progress, Screen, Text } from '../../src/ui';

/**
 * Today has exactly one dominant action at all times.
 *
 * The order is deliberate: lesson while the ramp is unfinished, then spar,
 * then Quench. It follows the arc of a day and it means a user never has to
 * decide what to do, which is the single biggest reason daily apps get skipped.
 */
export default function Today() {
  const router = useRouter();
  const profile = useMettle((s) => s.profile);
  const entitlement = useMettle((s) => s.entitlement);
  const spars = useMettle((s) => s.spars);
  const lessonProgress = useMettle((s) => s.lessonProgress);
  const streak = useStreak();
  const unlocks = useUnlocks();
  const intention = useMettle(selectTodayIntention);
  const quenchDone = useMettle(selectQuenchDoneToday);
  const totalXp = useMettle(selectTotalXp);

  const today = todayISO();
  const sparredToday = spars.some((s) => s.date === today);
  const lessonDoneToday = lessonProgress.some((p) => p.date === today);
  const permission = canSpar(entitlement);
  const level = levelFor(totalXp);
  const nextLesson = unlocks.nextLessonId ? lessonById.get(unlocks.nextLessonId) : null;

  // One lesson per day, then spar, then Quench. Offering lesson two straight
  // after lesson one would keep the Arena out of the primary slot for five
  // days, which is the exact mistake of burying the differentiated feature.
  const primary = nextLesson && !lessonDoneToday
    ? {
        eyebrow: `Lesson ${nextLesson.order} of 5`,
        title: nextLesson.title,
        body: nextLesson.subtitle,
        label: 'Start lesson',
        go: () => router.push(`/lesson/${nextLesson.id}`),
      }
    : !sparredToday && unlocks.arenaUnlocked
      ? {
          eyebrow: 'The Arena',
          title: "Today's spar",
          body: 'Three rounds. The pressure builds on what you write.',
          label: permission.allowed ? 'Enter the Arena' : 'Unlock the Arena',
          go: () => router.push(permission.allowed ? '/spar' : '/paywall'),
        }
      : !quenchDone
        ? {
            eyebrow: 'The Quench',
            title: 'Close the day',
            body: 'Sixty seconds. What held, what ran you.',
            label: 'Run the Quench',
            go: () => router.push('/quench'),
          }
        : null;

  return (
    <Screen scroll>
      <View style={styles.top}>
        <View>
          <Text variant="micro" tone="faint" caps>
            {profile ? `Tempering ${PATH_NOUN[profile.strugglePath]}` : 'Mettle'}
          </Text>
          <Text variant="title" style={{ marginTop: 2 }}>
            {greeting()}
          </Text>
        </View>
        <View style={styles.topRight}>
          <Flame days={streak.current} />
          <Pressable
            onPress={() => router.push('/settings')}
            hitSlop={12}
            accessibilityLabel="Settings"
          >
            <Text variant="caption" tone="faint">
              Settings
            </Text>
          </Pressable>
        </View>
      </View>

      {streak.atRisk ? (
        <Card style={styles.risk}>
          <Text variant="caption" color={palette.bending}>
            {streak.current} day{streak.current === 1 ? '' : 's'} on the line. One rep keeps it.
          </Text>
        </Card>
      ) : null}

      {primary ? (
        <Card accent style={styles.primary} testID="today-primary">
          <Text variant="micro" tone="ember" caps>
            {primary.eyebrow}
          </Text>
          <Text variant="heading" style={{ marginTop: spacing.sm }}>
            {primary.title}
          </Text>
          <Text variant="body" tone="secondary" style={{ marginTop: spacing.xs }}>
            {primary.body}
          </Text>
          <Button
            label={primary.label}
            onPress={primary.go}
            style={{ marginTop: spacing.base }}
            testID="today-cta"
          />
        </Card>
      ) : (
        <Card accent style={styles.primary}>
          <Text variant="micro" tone="ember" caps>
            Done
          </Text>
          <Text variant="heading" style={{ marginTop: spacing.sm }}>
            Everything for today is closed.
          </Text>
          <Text variant="body" tone="secondary" style={{ marginTop: spacing.xs }}>
            That is the whole method. Come back tomorrow.
          </Text>
          {nextLesson ? (
            <Button
              label={`Get ahead: lesson ${nextLesson.order}`}
              kind="secondary"
              style={{ marginTop: spacing.base }}
              onPress={() => router.push(`/lesson/${nextLesson.id}`)}
            />
          ) : null}
        </Card>
      )}

      {intention ? (
        <Card style={styles.block}>
          <Text variant="micro" tone="faint" caps>
            Carrying today
          </Text>
          <Text variant="bodyStrong" style={{ marginTop: spacing.sm }}>
            {intention.text}
          </Text>
          {intention.outcome ? (
            <Text variant="caption" tone="faint" style={{ marginTop: spacing.sm }}>
              Reviewed tonight: {outcomeLabel(intention.outcome)}
            </Text>
          ) : null}
        </Card>
      ) : null}

      <View style={styles.rowPair}>
        <StatusTile
          label="Spar"
          value={sparredToday ? 'Done' : permission.allowed ? 'Ready' : 'Locked'}
          hint={
            entitlement.status === 'active'
              ? 'Unlimited'
              : `${permission.remaining} free left`
          }
          onPress={() => router.push(unlocks.arenaUnlocked ? '/arena' : '/train')}
        />
        <StatusTile
          label="Quench"
          value={quenchDone ? 'Done' : 'Tonight'}
          hint={profile ? formatTime(profile.notificationTime) : ''}
          onPress={() => router.push('/quench')}
        />
      </View>

      <Card style={styles.block}>
        <View style={styles.levelRow}>
          <Text variant="micro" tone="faint" caps>
            Training volume
          </Text>
          <Text variant="caption" tone="faint">
            Level {level.level}
          </Text>
        </View>
        <View style={{ marginTop: spacing.sm }}>
          <Progress value={level.progress / level.needed} />
        </View>
        <Text variant="caption" tone="faint" style={{ marginTop: spacing.sm }}>
          {totalXp} XP. This measures how much you have trained, not how you are doing.
        </Text>
      </Card>
    </Screen>
  );
}

function StatusTile({
  label,
  value,
  hint,
  onPress,
}: {
  label: string;
  value: string;
  hint: string;
  onPress: () => void;
}) {
  return (
    <Card onPress={onPress} style={styles.tile}>
      <Text variant="micro" tone="faint" caps>
        {label}
      </Text>
      <Text variant="heading" style={{ marginTop: spacing.xs }}>
        {value}
      </Text>
      <Text variant="caption" tone="faint" style={{ marginTop: 2 }}>
        {hint}
      </Text>
    </Card>
  );
}

function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 12) return 'Morning.';
  if (h < 17) return 'Afternoon.';
  return 'Evening.';
}

function formatTime(hhmm: string): string {
  const [h] = hhmm.split(':').map(Number);
  if (h === undefined) return hhmm;
  const suffix = h >= 12 ? 'pm' : 'am';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}${suffix}`;
}

const outcomeLabel = (o: 'yes' | 'no' | 'sort_of') =>
  o === 'yes' ? 'held it' : o === 'no' ? 'did not hold it' : 'sort of';

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: spacing.base,
    paddingBottom: spacing.lg,
  },
  primary: { marginBottom: spacing.md },
  block: { marginBottom: spacing.md },
  risk: { marginBottom: spacing.md, borderColor: palette.bending, backgroundColor: palette.bendingWash },
  rowPair: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  tile: { flex: 1, borderRadius: radius.lg },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  topRight: { alignItems: 'flex-end', gap: spacing.sm },
});
