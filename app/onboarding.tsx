import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { virtues } from '../src/content/schema';
import { PATH_NOUN, steps, TOTAL_STEPS, type Answers } from '../src/features/onboarding/steps';
import { track } from '../src/lib/analytics';
import { useMettle } from '../src/state/store';
import { palette, radius, spacing, virtueColor, virtueLabel } from '../src/theme/tokens';
import { Button, Card, Screen, Stepper, Text } from '../src/ui';
import type { StrugglePath, UserProfile } from '../src/domain/types';

export default function Onboarding() {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [saving, setSaving] = useState(false);
  const saveProfile = useMettle((s) => s.saveProfile);
  const router = useRouter();

  const step = steps[index]!;
  const path = (answers.path as StrugglePath) ?? 'anxiety';

  const advance = useCallback(() => setIndex((i) => Math.min(i + 1, TOTAL_STEPS - 1)), []);
  const back = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  const answer = useCallback(
    (key: string, value: string) => {
      setAnswers((a) => ({ ...a, [key]: value }));
      advance();
    },
    [advance],
  );

  const finish = useCallback(async () => {
    setSaving(true);
    const profile: UserProfile = {
      strugglePath: path,
      onboardingAnswers: answers as Record<string, string>,
      minutesCommitment: (Number(answers.minutes) as 3 | 5 | 10) || 5,
      notificationTime: answers.notificationTime ?? '21:00',
      displayName: null,
      onboardedAt: new Date().toISOString(),
    };
    await saveProfile(profile);
    track({
      name: 'onboarding_complete',
      path: profile.strugglePath,
      minutes: profile.minutesCommitment,
    });
    router.replace('/');
  }, [answers, path, saveProfile, router]);

  return (
    <Screen>
      <View style={styles.header}>
        <Stepper total={TOTAL_STEPS} index={index} />
        {index > 0 ? (
          <Pressable onPress={back} hitSlop={12} accessibilityRole="button">
            <Text variant="caption" tone="faint">
              Back
            </Text>
          </Pressable>
        ) : null}
      </View>

      {step.kind === 'statement' ? (
        <Statement
          eyebrow={step.eyebrow}
          title={step.title}
          body={step.body}
          cta={step.cta}
          onNext={advance}
        />
      ) : null}

      {step.kind === 'choice' ? (
        <Choice
          eyebrow={step.eyebrow}
          title={step.title(answers)}
          options={step.options(answers)}
          onPick={(value) => answer(step.key, value)}
        />
      ) : null}

      {step.kind === 'plan' ? <PlanReveal path={path} onNext={advance} /> : null}
      {step.kind === 'timeline' ? <Timeline path={path} onNext={advance} /> : null}
      {step.kind === 'commit' ? (
        <Commit
          minutes={answers.minutes ?? '5'}
          onPick={(time) => {
            setAnswers((a) => ({ ...a, notificationTime: time }));
            advance();
          }}
        />
      ) : null}
      {step.kind === 'handoff' ? <Handoff path={path} saving={saving} onNext={finish} /> : null}
    </Screen>
  );
}

// ---------------------------------------------------------------------------

function Statement({
  eyebrow,
  title,
  body,
  cta,
  onNext,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  cta: string;
  onNext: () => void;
}) {
  return (
    <View style={styles.fill}>
      <View style={styles.center}>
        {eyebrow ? (
          <Text variant="micro" tone="ember" caps>
            {eyebrow}
          </Text>
        ) : null}
        <Text variant="display" style={styles.title}>
          {title}
        </Text>
        {body ? (
          <Text variant="body" tone="secondary" style={styles.body}>
            {body}
          </Text>
        ) : null}
      </View>
      <Button label={cta} onPress={onNext} />
    </View>
  );
}

function Choice({
  eyebrow,
  title,
  options,
  onPick,
}: {
  eyebrow?: string;
  title: string;
  options: { value: string; label: string; sub?: string }[];
  onPick: (value: string) => void;
}) {
  return (
    <View style={styles.fill}>
      <View style={styles.questionHead}>
        {eyebrow ? (
          <Text variant="micro" tone="ember" caps>
            {eyebrow}
          </Text>
        ) : null}
        <Text variant="title" style={styles.title}>
          {title}
        </Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.options}>
          {options.map((o) => (
            <Card key={o.value} onPress={() => onPick(o.value)} testID={`opt-${o.value}`}>
              <Text variant="bodyStrong">{o.label}</Text>
              {o.sub ? (
                <Text variant="caption" tone="faint" style={{ marginTop: 4 }}>
                  {o.sub}
                </Text>
              ) : null}
            </Card>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function PlanReveal({ path, onNext }: { path: StrugglePath; onNext: () => void }) {
  // A starting radar of zero is the honest number, and it makes the point:
  // nothing has been earned yet.
  const noun = PATH_NOUN[path];
  return (
    <View style={styles.fill}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text variant="micro" tone="ember" caps>
          Your plan
        </Text>
        <Text variant="title" style={styles.title}>
          Foundations, then {noun.toLowerCase()}, every evening.
        </Text>

        <View style={styles.planList}>
          <PlanRow n="1" title="Foundations of Control" body="Five lessons. The distinctions everything else is built on." />
          <PlanRow n="2" title={`The Arena: Tempering ${noun}`} body="Scenarios built for how this actually shows up for you. Scored on what you write." />
          <PlanRow n="3" title="The Quench" body="Sixty seconds each night. This is where the app learns your patterns." />
        </View>

        <Card style={{ marginTop: spacing.lg }}>
          <Text variant="micro" tone="faint" caps>
            Starting position
          </Text>
          <View style={styles.radarRow}>
            {virtues.map((v) => (
              <View key={v} style={styles.radarItem}>
                <View style={[styles.radarDot, { borderColor: virtueColor[v] }]} />
                <Text variant="caption" tone="faint">
                  {virtueLabel[v]}
                </Text>
              </View>
            ))}
          </View>
          <Text variant="caption" tone="faint" style={{ marginTop: spacing.sm }}>
            Empty. Nothing here is given to you, and nothing is measured until you do a rep.
          </Text>
        </Card>
      </ScrollView>
      <Button label="Continue" onPress={onNext} style={{ marginTop: spacing.base }} />
    </View>
  );
}

function PlanRow({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <View style={styles.planRow}>
      <View style={styles.planNum}>
        <Text variant="caption" color={palette.ember}>
          {n}
        </Text>
      </View>
      <View style={styles.flex1}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="caption" tone="secondary" style={{ marginTop: 2 }}>
          {body}
        </Text>
      </View>
    </View>
  );
}

function Timeline({ path, onNext }: { path: StrugglePath; onNext: () => void }) {
  // Deliberately a plan timeline, not an outcome claim. Mettle cannot measure
  // whether someone's anger improved, so it does not promise that it will.
  return (
    <View style={styles.fill}>
      <View style={styles.center}>
        <Text variant="micro" tone="ember" caps>
          What happens
        </Text>
        <Text variant="title" style={styles.title}>
          Nobody can promise you a calmer month. Here is what you will actually have.
        </Text>
        <View style={styles.planList}>
          <PlanRow n="1" title="Today" body={`Lesson one, then your first spar. A real ${PATH_NOUN[path].toLowerCase()} scenario, scored on what you write.`} />
          <PlanRow n="7" title="Week one" body="Five lessons done. The Arena adapting to where you keep getting caught." />
          <PlanRow n="30" title="Month one" body="Enough evenings logged that Mettle can show you your own patterns. What sets you off, and when." />
        </View>
      </View>
      <Button label="Continue" onPress={onNext} />
    </View>
  );
}

const TIMES = [
  { value: '20:00', label: '8pm' },
  { value: '21:00', label: '9pm' },
  { value: '22:00', label: '10pm' },
  { value: '23:00', label: '11pm' },
];

function Commit({ minutes, onPick }: { minutes: string; onPick: (time: string) => void }) {
  return (
    <View style={styles.fill}>
      <View style={styles.questionHead}>
        <Text variant="micro" tone="ember" caps>
          {minutes} minutes a day
        </Text>
        <Text variant="title" style={styles.title}>
          When do you want the evening nudge?
        </Text>
        <Text variant="caption" tone="faint">
          One notification a night for the Quench. Nothing else, ever.
        </Text>
      </View>
      <View style={styles.options}>
        {TIMES.map((t) => (
          <Card key={t.value} onPress={() => onPick(t.value)}>
            <Text variant="bodyStrong">{t.label}</Text>
          </Card>
        ))}
      </View>
    </View>
  );
}

function Handoff({
  path,
  saving,
  onNext,
}: {
  path: StrugglePath;
  saving: boolean;
  onNext: () => void;
}) {
  return (
    <View style={styles.fill}>
      <View style={styles.center}>
        <Text variant="micro" tone="ember" caps>
          Day one
        </Text>
        <Text variant="display" style={styles.title}>
          Enough setup.
        </Text>
        <Text variant="body" tone="secondary" style={styles.body}>
          One lesson, then one spar. About four minutes. You will get a verdict on
          something you actually wrote, tonight.
        </Text>
        <Text variant="caption" tone="faint" style={{ marginTop: spacing.base }}>
          Training {PATH_NOUN[path].toLowerCase()}. Free, no account needed.
        </Text>
      </View>
      {saving ? (
        <ActivityIndicator color={palette.ember} style={{ height: 54 }} />
      ) : (
        <Button label="Begin training" onPress={onNext} testID="begin-training" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.base },
  fill: { flex: 1, paddingBottom: spacing.base },
  flex1: { flex: 1 },
  center: { flex: 1, justifyContent: 'center' },
  questionHead: { paddingTop: spacing.xl, paddingBottom: spacing.lg },
  title: { marginTop: spacing.sm },
  body: { marginTop: spacing.base },
  options: { gap: spacing.md, paddingBottom: spacing.lg },
  planList: { marginTop: spacing.lg, gap: spacing.base },
  planRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  planNum: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.emberDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  radarItem: { alignItems: 'center', gap: 6 },
  radarDot: { width: 22, height: 22, borderRadius: radius.pill, borderWidth: 2, opacity: 0.35 },
});
