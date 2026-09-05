import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { heldChips, ranChips } from '../src/content';
import {
  buildSealLine,
  screenForCrisis,
  settings,
  timesOfDay,
  todayISO,
  type Intention,
  type Setting,
  type TimeOfDay,
} from '../src/domain';
import { useStreak } from '../src/state/hooks';
import { selectTodayIntention, useMettle } from '../src/state/store';
import { palette, spacing, virtueColor } from '../src/theme/tokens';
import { Button, Card, Chip, CrisisScreen, Flame, Screen, Text, TextArea } from '../src/ui';

/**
 * The Quench must survive a tired person in bed at 11pm, so every step is
 * chips-first and skippable, and the whole thing is completable with taps only.
 *
 * The optional "when" and "where" taps are the difference between The Pattern
 * saying "you took things personally 11 times" and "9 of them were at work,
 * after lunch". Two taps, and they are what make the fifth surface worth having.
 */

type Step = 'intention' | 'held' | 'ran' | 'context' | 'seal' | 'crisis';

export default function Quench() {
  const router = useRouter();
  const intention = useMettle(selectTodayIntention);
  const history = useMettle((s) => s.quenchEntries);
  const saveQuench = useMettle((s) => s.saveQuench);
  const streak = useStreak();

  const [step, setStep] = useState<Step>(intention ? 'intention' : 'held');
  const [outcome, setOutcome] = useState<Intention['outcome']>(null);
  const [held, setHeld] = useState<string[]>([]);
  const [ran, setRan] = useState<string[]>([]);
  const [heldText, setHeldText] = useState('');
  const [ranText, setRanText] = useState('');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay | null>(null);
  const [setting, setSetting] = useState<Setting | null>(null);
  const [saving, setSaving] = useState(false);

  const date = todayISO();

  const sealLine = useMemo(
    () =>
      buildSealLine({
        entry: { heldChipIds: held, ranChipIds: ran, date },
        history: history.filter((e) => e.date !== date),
        currentStreak: streak.current,
      }),
    [held, ran, date, history, streak.current],
  );

  const toggle = (list: string[], set: (v: string[]) => void, id: string) =>
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const commit = useCallback(async () => {
    // Free text in the Quench goes through the same guardrail as the Arena.
    const screened = screenForCrisis(`${heldText}\n${ranText}`);
    if (screened.crisis) {
      setStep('crisis');
      return;
    }

    setSaving(true);
    await saveQuench(
      {
        date,
        heldChipIds: held,
        ranChipIds: ran,
        heldText: heldText.trim() || null,
        ranText: ranText.trim() || null,
        timeOfDay,
        setting,
        sealLine,
      },
      outcome,
    );
    setSaving(false);
    setStep('seal');
  }, [heldText, ranText, saveQuench, date, held, ran, timeOfDay, setting, sealLine, outcome]);

  if (step === 'crisis') return <CrisisScreen onDismiss={() => router.replace('/')} />;

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Close the Quench">
          <Text variant="body" tone="faint">
            {step === 'seal' ? '' : 'Close'}
          </Text>
        </Pressable>
        <Text variant="micro" tone="faint" caps>
          The Quench
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {step === 'intention' && intention ? (
          <>
            <Text variant="micro" tone="ember" caps>
              This morning you said
            </Text>
            <Text variant="title" style={styles.prompt}>
              {intention.text}
            </Text>
            <View style={styles.chips}>
              {(
                [
                  ['yes', 'Held it'],
                  ['sort_of', 'Sort of'],
                  ['no', 'No'],
                ] as const
              ).map(([value, label]) => (
                <Chip
                  key={value}
                  label={label}
                  selected={outcome === value}
                  onPress={() => setOutcome(value)}
                />
              ))}
            </View>
          </>
        ) : null}

        {step === 'held' ? (
          <ChipStep
            eyebrow="Where did you hold the line today?"
            chips={heldChips}
            selected={held}
            onToggle={(id) => toggle(held, setHeld, id)}
            text={heldText}
            onText={setHeldText}
          />
        ) : null}

        {step === 'ran' ? (
          <ChipStep
            eyebrow="Where did a judgment run you?"
            chips={ranChips}
            selected={ran}
            onToggle={(id) => toggle(ran, setRan, id)}
            text={ranText}
            onText={setRanText}
          />
        ) : null}

        {step === 'context' ? (
          <>
            <Text variant="micro" tone="ember" caps>
              Optional, two taps
            </Text>
            <Text variant="title" style={styles.prompt}>
              When did it hit, and where were you?
            </Text>
            <Text variant="caption" tone="faint" style={{ marginBottom: spacing.base }}>
              This is what lets Mettle show you your patterns later. Skip it if you are tired.
            </Text>
            <View style={styles.chips}>
              {timesOfDay.map((t) => (
                <Chip
                  key={t}
                  label={t[0]!.toUpperCase() + t.slice(1)}
                  selected={timeOfDay === t}
                  onPress={() => setTimeOfDay(timeOfDay === t ? null : t)}
                />
              ))}
            </View>
            <View style={[styles.chips, { marginTop: spacing.base }]}>
              {settings.map((s) => (
                <Chip
                  key={s}
                  label={s[0]!.toUpperCase() + s.slice(1)}
                  selected={setting === s}
                  onPress={() => setSetting(setting === s ? null : s)}
                />
              ))}
            </View>
          </>
        ) : null}

        {step === 'seal' ? (
          <View style={styles.seal}>
            <Flame days={streak.current} size={40} />
            <Text variant="display" style={styles.sealStreak}>
              {streak.current} day{streak.current === 1 ? '' : 's'}
            </Text>
            <Card style={styles.sealCard}>
              <Text variant="bodyStrong" center tone="ember">
                {sealLine}
              </Text>
            </Card>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        {step === 'intention' ? (
          <Button label="Next" disabled={!outcome} onPress={() => setStep('held')} />
        ) : null}
        {step === 'held' ? (
          <Button label="Next" onPress={() => setStep('ran')} />
        ) : null}
        {step === 'ran' ? (
          <Button label="Next" onPress={() => setStep('context')} />
        ) : null}
        {step === 'context' ? (
          <Button label="Seal the day" loading={saving} onPress={commit} />
        ) : null}
        {step === 'seal' ? (
          <Button label="Done" onPress={() => router.replace('/')} testID="quench-done" />
        ) : null}
      </View>
    </Screen>
  );
}

function ChipStep({
  eyebrow,
  chips,
  selected,
  onToggle,
  text,
  onText,
}: {
  eyebrow: string;
  chips: { id: string; label: string; virtue: keyof typeof virtueColor }[];
  selected: string[];
  onToggle: (id: string) => void;
  text: string;
  onText: (t: string) => void;
}) {
  return (
    <>
      <Text variant="title" style={styles.prompt}>
        {eyebrow}
      </Text>
      <Text variant="caption" tone="faint" style={{ marginBottom: spacing.base }}>
        Tap any that apply. None is a valid answer.
      </Text>
      <View style={styles.chips}>
        {chips.map((c) => (
          <Chip
            key={c.id}
            label={c.label}
            selected={selected.includes(c.id)}
            accentColor={virtueColor[c.virtue]}
            onPress={() => onToggle(c.id)}
          />
        ))}
      </View>
      <View style={{ marginTop: spacing.lg }}>
        <TextArea
          value={text}
          onChangeText={onText}
          placeholder="One line, if you want. Optional."
          minHeight={72}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, flexGrow: 1 },
  prompt: { marginTop: spacing.sm, marginBottom: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.base },
  seal: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sealStreak: { marginTop: spacing.base },
  sealCard: { marginTop: spacing.lg, borderColor: palette.emberDim },
});
