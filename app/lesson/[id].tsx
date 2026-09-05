import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { lessonById } from '../../src/content';
import type { LessonCard } from '../../src/content/schema';
import { track } from '../../src/lib/analytics';
import { requestPermission, scheduleQuenchReminder } from '../../src/lib/notifications';
import { useMettle } from '../../src/state/store';
import { palette, radius, spacing } from '../../src/theme/tokens';
import { Button, Card, Progress, Screen, Text } from '../../src/ui';

/**
 * The lesson engine.
 *
 * One template renders every lesson. Tap to advance rather than swipe: Duolingo
 * is tap-driven for good reason, it works identically on web, and it avoids
 * gesture handling that cannot be verified in this environment.
 *
 * Wrong answers cost nothing but a correction line and a retry. "Perfect" means
 * every check and rep right first try, which is the only thing that carries a
 * bonus. There is no free text anywhere in a lesson by design; free text exists
 * only in the Arena and the Quench.
 */
export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const completeLesson = useMettle((s) => s.completeLesson);
  const setIntention = useMettle((s) => s.setIntention);
  const profile = useMettle((s) => s.profile);
  const completedCount = useMettle((s) => s.lessonProgress.length);
  const firstLesson = completedCount === 0;
  const notificationTime = profile?.notificationTime ?? null;

  const lesson = id ? lessonById.get(id) : undefined;
  const [index, setIndex] = useState(0);
  const [missed, setMissed] = useState(false);
  const [busy, setBusy] = useState(false);

  const advance = useCallback(() => setIndex((i) => i + 1), []);

  const finish = useCallback(
    async (intentionText: string) => {
      if (!lesson) return;
      setBusy(true);
      await completeLesson(lesson.id, !missed);
      await setIntention(intentionText, lesson.id);
      track({ name: 'lesson_complete', lessonId: lesson.id, perfect: !missed });

      // Asked here, not at launch: a permission prompt before the app has done
      // anything for you is how you earn a permanent denial.
      if (firstLesson) {
        const granted = await requestPermission();
        if (granted && notificationTime) {
          await scheduleQuenchReminder(notificationTime, 1);
        }
      }
      router.replace('/');
    },
    [lesson, missed, completeLesson, setIntention, router, firstLesson, notificationTime],
  );

  if (!lesson) {
    return (
      <Screen>
        <Text variant="title">Lesson not found</Text>
      </Screen>
    );
  }

  const card = lesson.cards[index]!;
  const progress = (index + 1) / lesson.cards.length;

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Close lesson">
          <Text variant="body" tone="faint">
            Close
          </Text>
        </Pressable>
        <View style={styles.progressWrap}>
          <Progress value={progress} />
        </View>
        <Text variant="caption" tone="faint">
          {index + 1}/{lesson.cards.length}
        </Text>
      </View>

      <CardView
        key={card.id}
        card={card}
        path={profile?.strugglePath ?? 'anxiety'}
        busy={busy}
        onAdvance={advance}
        onMiss={() => setMissed(true)}
        onFinish={finish}
      />
    </Screen>
  );
}

interface CardViewProps {
  card: LessonCard;
  path: 'anger' | 'anxiety' | 'distraction' | 'discipline';
  busy: boolean;
  onAdvance: () => void;
  onMiss: () => void;
  onFinish: (intention: string) => void;
}

function CardView({ card, path, busy, onAdvance, onMiss, onFinish }: CardViewProps) {
  switch (card.type) {
    case 'hook':
      return (
        <Frame
          eyebrow="Where this shows up"
          footer={<Button label="Go on" onPress={onAdvance} />}
        >
          <Text variant="heading" style={styles.hook}>
            {card.variants[path]}
          </Text>
        </Frame>
      );

    case 'concept':
      return (
        <Frame eyebrow="Concept" footer={<Button label="Continue" onPress={onAdvance} />}>
          <Text variant="title">{card.heading}</Text>
          {card.quote ? (
            <Card style={styles.quote}>
              <Text variant="body" style={styles.quoteText}>
                "{card.quote.text}"
              </Text>
              <Text variant="caption" tone="faint" style={{ marginTop: spacing.sm }}>
                {card.quote.attribution}
              </Text>
              <View style={styles.rule} />
              <Text variant="bodyStrong" tone="ember">
                {card.quote.translation}
              </Text>
            </Card>
          ) : null}
          <Text variant="body" tone="secondary" style={styles.body}>
            {card.body}
          </Text>
        </Frame>
      );

    case 'check':
      return card.interaction === 'sort' ? (
        <SortCardView card={card} onAdvance={onAdvance} onMiss={onMiss} />
      ) : (
        <ChoiceCardView
          eyebrow="Check"
          prompt={card.prompt}
          options={card.options}
          onAdvance={onAdvance}
          onMiss={onMiss}
        />
      );

    case 'rep':
      return (
        <ChoiceCardView
          eyebrow="Rep"
          prompt={card.scenario}
          options={card.options}
          onAdvance={onAdvance}
          onMiss={onMiss}
        />
      );

    case 'carry':
      return <CarryCardView card={card} busy={busy} onFinish={onFinish} />;
  }
}

function Frame({
  eyebrow,
  children,
  footer,
}: {
  eyebrow: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <View style={styles.frame}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text variant="micro" tone="ember" caps>
          {eyebrow}
        </Text>
        <View style={{ marginTop: spacing.base }}>{children}</View>
      </ScrollView>
      <View style={styles.footer}>{footer}</View>
    </View>
  );
}

interface Option {
  id: string;
  text: string;
  correct: boolean;
  feedback: string;
}

function ChoiceCardView({
  eyebrow,
  prompt,
  options,
  onAdvance,
  onMiss,
}: {
  eyebrow: string;
  prompt: string;
  options: readonly Option[];
  onAdvance: () => void;
  onMiss: () => void;
}) {
  const [picked, setPicked] = useState<Option | null>(null);
  const [firstTry, setFirstTry] = useState(true);

  const choose = (option: Option) => {
    setPicked(option);
    if (!option.correct && firstTry) {
      onMiss();
      setFirstTry(false);
    }
  };

  return (
    <Frame
      eyebrow={eyebrow}
      footer={
        picked?.correct ? (
          <Button label="Continue" onPress={onAdvance} />
        ) : picked ? (
          // A wrong answer costs a correction line and a retry, nothing else.
          <Button label="Try again" kind="secondary" onPress={() => setPicked(null)} />
        ) : null
      }
    >
      <Text variant="heading">{prompt}</Text>
      <View style={styles.options}>
        {options.map((o) => {
          const isPicked = picked?.id === o.id;
          return (
            <Card
              key={o.id}
              onPress={picked ? undefined : () => choose(o)}
              style={
                isPicked
                  ? o.correct
                    ? styles.correct
                    : styles.wrong
                  : undefined
              }
            >
              <Text variant="bodyStrong">{o.text}</Text>
              {isPicked ? (
                <Text
                  variant="caption"
                  color={o.correct ? palette.tempered : palette.bending}
                  style={{ marginTop: spacing.sm }}
                >
                  {o.feedback}
                </Text>
              ) : null}
            </Card>
          );
        })}
      </View>
    </Frame>
  );
}

/**
 * Sorting is one item at a time with two buttons rather than drag-and-drop.
 * Dragging is worse on a phone, worse for accessibility, and adds a gesture
 * dependency for no teaching benefit.
 */
function SortCardView({
  card,
  onAdvance,
  onMiss,
}: {
  card: Extract<LessonCard, { type: 'check'; interaction: 'sort' }>;
  onAdvance: () => void;
  onMiss: () => void;
}) {
  const [i, setI] = useState(0);
  const [feedback, setFeedback] = useState<{ right: boolean } | null>(null);
  const item = card.items[i];
  const done = i >= card.items.length;

  const answer = (bucket: 'control' | 'not_control') => {
    if (!item) return;
    const right = item.bucket === bucket;
    if (!right) onMiss();
    setFeedback({ right });
    setTimeout(() => {
      setFeedback(null);
      if (right) setI((n) => n + 1);
    }, 700);
  };

  return (
    <Frame
      eyebrow="Sort"
      footer={done ? <Button label="Continue" onPress={onAdvance} /> : null}
    >
      <Text variant="heading">{card.prompt}</Text>
      <View style={styles.sortCounter}>
        <Progress value={i / card.items.length} height={4} />
      </View>

      {done ? (
        <Card style={styles.correct}>
          <Text variant="bodyStrong" color={palette.tempered}>
            All sorted.
          </Text>
          <Text variant="caption" tone="secondary" style={{ marginTop: spacing.xs }}>
            The left column is where all of your leverage lives.
          </Text>
        </Card>
      ) : (
        <>
          <Card
            style={[
              styles.sortItem,
              feedback ? (feedback.right ? styles.correct : styles.wrong) : undefined,
            ]}
          >
            <Text variant="title" center>
              {item?.text}
            </Text>
          </Card>
          <View style={styles.sortButtons}>
            <Button
              label="Up to me"
              kind="secondary"
              style={styles.flex1}
              onPress={() => answer('control')}
            />
            <Button
              label="Not up to me"
              kind="secondary"
              style={styles.flex1}
              onPress={() => answer('not_control')}
            />
          </View>
        </>
      )}
    </Frame>
  );
}

function CarryCardView({
  card,
  busy,
  onFinish,
}: {
  card: Extract<LessonCard, { type: 'carry' }>;
  busy: boolean;
  onFinish: (intention: string) => void;
}) {
  const [chosen, setChosen] = useState<string | null>(null);

  return (
    <Frame
      eyebrow="Carry"
      footer={
        <Button
          label="Set intention and finish"
          disabled={!chosen}
          loading={busy}
          onPress={() => chosen && onFinish(chosen)}
        />
      }
    >
      <Text variant="heading">{card.prompt}</Text>
      <View style={styles.options}>
        {card.intentions.map((t) => (
          <Card key={t} onPress={() => setChosen(t)} accent={chosen === t}>
            <Text variant="bodyStrong" color={chosen === t ? palette.ember : palette.silver}>
              {t}
            </Text>
          </Card>
        ))}
      </View>
      <Text variant="caption" tone="faint" style={{ marginTop: spacing.base }}>
        The Quench will ask you about this tonight.
      </Text>
    </Frame>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  progressWrap: { flex: 1 },
  frame: { flex: 1 },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, flexGrow: 1 },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.base },
  hook: { lineHeight: 30 },
  body: { marginTop: spacing.base },
  quote: { marginTop: spacing.base, backgroundColor: palette.surfaceRaised },
  quoteText: { fontStyle: 'italic' },
  rule: {
    height: 1,
    backgroundColor: palette.hairline,
    marginVertical: spacing.md,
  },
  options: { marginTop: spacing.lg, gap: spacing.md },
  correct: { borderColor: palette.tempered, backgroundColor: palette.temperedWash },
  wrong: { borderColor: palette.bending, backgroundColor: palette.bendingWash },
  sortCounter: { marginTop: spacing.base },
  sortItem: { marginTop: spacing.lg, paddingVertical: spacing.xl },
  sortButtons: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  flex1: { flex: 1 },
});
