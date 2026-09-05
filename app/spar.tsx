import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { Scenario } from '../src/content/schema';
import { getRepository } from '../src/data';
import type { SparScoreResult } from '../src/data/types';
import {
  canSpar,
  isFinalFreeSpar,
  selectJitConcept,
  selectScenario,
  todayISO,
  type JitDelivery,
  type SparRound,
} from '../src/domain';
import { useRadar, useSeenConceptIds, useSeenScenarioIds } from '../src/state/hooks';
import { track } from '../src/lib/analytics';
import { useMettle } from '../src/state/store';
import { palette, radius, spacing, verdictColor } from '../src/theme/tokens';
import { Button, Card, Chip, CrisisScreen, Screen, Text, TextArea, VerdictBadge } from '../src/ui';

/**
 * A spar is three compounding rounds, not one scenario and a rematch.
 *
 * Each escalation quotes the user's own previous answer back at them, which is
 * what makes it feel like sparring rather than a quiz, and what makes the
 * result worth screenshotting. Scoring happens once, over the whole exchange,
 * so holding the line under pressure is what is actually measured.
 */

type Phase =
  | { kind: 'instinct' }
  | { kind: 'write'; round: number }
  | { kind: 'escalating' }
  | { kind: 'scoring' }
  | { kind: 'verdict' }
  | { kind: 'concept'; delivery: JitDelivery }
  | { kind: 'crisis' };

const ROUNDS = 3;

export default function Spar() {
  const router = useRouter();
  const repo = getRepository();

  const profile = useMettle((s) => s.profile);
  const entitlement = useMettle((s) => s.entitlement);
  const saveSpar = useMettle((s) => s.saveSpar);
  const markConceptDelivered = useMettle((s) => s.markConceptDelivered);
  const sparCount = useMettle((s) => s.spars.length);
  const radar = useRadar();
  const seenScenarioIds = useSeenScenarioIds();
  const seenConceptIds = useSeenConceptIds();

  // Selected once per mount. The seed keeps it stable across re-renders so the
  // scenario cannot change underneath the user mid-spar.
  const selection = useMemo(
    () =>
      selectScenario({
        path: profile?.strugglePath ?? 'anxiety',
        seenScenarioIds,
        radar,
        seed: `${todayISO()}:${sparCount}`,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const scenario: Scenario = selection.scenario;

  const [phase, setPhase] = useState<Phase>({ kind: 'instinct' });
  const [instinct, setInstinct] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [prompts, setPrompts] = useState<string[]>([scenario.opening]);
  const [responses, setResponses] = useState<string[]>([]);
  const [result, setResult] = useState<Extract<SparScoreResult, { crisis: false }> | null>(null);
  const [peer, setPeer] = useState<string | null>(null);
  const saved = useRef(false);
  const savedId = useRef<string | null>(null);

  const permission = canSpar(entitlement);
  const lastFree = isFinalFreeSpar(entitlement);

  useEffect(() => {
    if (!permission.allowed) router.replace('/paywall');
  }, [permission.allowed, router]);

  const submitRound = useCallback(async () => {
    const text = draft.trim();
    if (text.length === 0) return;

    const nextResponses = [...responses, text];
    setResponses(nextResponses);
    setDraft('');

    if (nextResponses.length < ROUNDS) {
      setPhase({ kind: 'escalating' });
      const roundIndex = nextResponses.length as 1 | 2;
      const prompt = await repo.escalate({ scenario, roundIndex, previousResponse: text });
      setPrompts((p) => [...p, prompt]);
      setPhase({ kind: 'write', round: nextResponses.length });
      return;
    }

    setPhase({ kind: 'scoring' });
    const scored = await repo.scoreSpar({ scenario, responses: nextResponses });

    // A crisis result carries no verdict, so there is nothing to show or store.
    if (scored.crisis) {
      track({ name: 'crisis_guardrail', surface: 'arena', layer: 1 });
      setPhase({ kind: 'crisis' });
      return;
    }

    setResult(scored);
    // Held locally as well: setPeer will not have landed by the time the
    // session is written below.
    const peerResponse = await repo.peerResponse(scenario.id);
    setPeer(peerResponse);

    if (!saved.current) {
      saved.current = true;
      savedId.current = await saveSpar({
        scenarioId: scenario.id,
        path: scenario.path,
        virtue: scenario.virtue,
        targetConcepts: [...scenario.targetConcepts],
        rounds: nextResponses.map<SparRound>((response, i) => ({
          prompt: prompts[i] ?? '',
          instinct: i === 0 ? instinct : null,
          response,
        })),
        verdict: scored.verdict,
        strength: scored.strength,
        miss: scored.miss,
        referenceAnswer: scenario.referenceAnswer,
        peerResponse,
        date: todayISO(),
      });
    }

    track({ name: 'spar_complete', verdict: scored.verdict, rounds: nextResponses.length });
    setPhase({ kind: 'verdict' });
  }, [draft, responses, repo, scenario, prompts, instinct, saveSpar]);

  const finish = useCallback(async () => {
    if (!result) return router.replace('/');
    const delivery = selectJitConcept(
      { verdict: result.verdict, targetConcepts: scenario.targetConcepts, virtue: scenario.virtue },
      seenConceptIds,
    );
    if (delivery) {
      await markConceptDelivered(delivery.concept.id);
      track({ name: 'concept_delivered', conceptId: delivery.concept.id, reason: delivery.reason });
      setPhase({ kind: 'concept', delivery });
      return;
    }
    router.replace('/');
  }, [result, scenario, seenConceptIds, markConceptDelivered, router]);

  if (phase.kind === 'crisis') return <CrisisScreen onDismiss={() => router.replace('/')} />;

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Leave the Arena">
          <Text variant="body" tone="faint">
            Leave
          </Text>
        </Pressable>
        <Text variant="micro" tone="faint" caps>
          {phase.kind === 'verdict' || phase.kind === 'concept'
            ? 'Verdict'
            : `Round ${Math.min(responses.length + 1, ROUNDS)} of ${ROUNDS}`}
        </Text>
      </View>

      {phase.kind === 'instinct' ? (
        <Instinct
          scenario={scenario}
          selected={instinct}
          onSelect={setInstinct}
          lastFree={lastFree}
          onStart={() => {
            track({ name: 'spar_start', scenarioId: scenario.id, source: selection.source });
            setPhase({ kind: 'write', round: 0 });
          }}
        />
      ) : null}

      {phase.kind === 'write' ? (
        <Write
          prompt={prompts[phase.round] ?? scenario.opening}
          round={phase.round}
          value={draft}
          onChange={setDraft}
          onSubmit={submitRound}
        />
      ) : null}

      {phase.kind === 'escalating' || phase.kind === 'scoring' ? (
        <Waiting scoring={phase.kind === 'scoring'} />
      ) : null}

      {phase.kind === 'verdict' && result ? (
        <Verdict
          result={result}
          scenario={scenario}
          peer={peer}
          responses={responses}
          onDone={finish}
          onShare={() => savedId.current && router.push(`/share/${savedId.current}`)}
        />
      ) : null}

      {phase.kind === 'concept' ? (
        <ConceptDelivery delivery={phase.delivery} onDone={() => router.replace('/')} />
      ) : null}
    </Screen>
  );
}

// ---------------------------------------------------------------------------

function Instinct({
  scenario,
  selected,
  onSelect,
  lastFree,
  onStart,
}: {
  scenario: Scenario;
  selected: string | null;
  onSelect: (v: string) => void;
  lastFree: boolean;
  onStart: () => void;
}) {
  return (
    <Body
      footer={
        <Button label="Now the trained response" disabled={!selected} onPress={onStart} />
      }
    >
      {lastFree ? (
        <Card style={styles.notice}>
          <Text variant="caption" color={palette.bending}>
            Last free spar. We would rather tell you now than surprise you after.
          </Text>
        </Card>
      ) : null}

      <Text variant="micro" tone="ember" caps>
        The situation
      </Text>
      <Text variant="heading" style={styles.scenario}>
        {scenario.opening}
      </Text>

      <Text variant="bodyStrong" style={styles.question}>
        First instinct. Be honest, nobody is watching.
      </Text>
      <View style={styles.chips}>
        {scenario.instinctOptions.map((o, i) => (
          <Chip
            key={o}
            label={o}
            selected={selected === o}
            onPress={() => onSelect(o)}
            testID={`instinct-${i}`}
          />
        ))}
      </View>
    </Body>
  );
}

function Write({
  prompt,
  round,
  value,
  onChange,
  onSubmit,
}: {
  prompt: string;
  round: number;
  value: string;
  onChange: (t: string) => void;
  onSubmit: () => void;
}) {
  return (
    <Body
      footer={
        <Button
          label={round === ROUNDS - 1 ? 'Submit for a verdict' : 'Hold the line'}
          disabled={value.trim().length === 0}
          onPress={onSubmit}
          testID="submit-round"
        />
      }
    >
      <Text variant="micro" tone="ember" caps>
        {round === 0 ? 'The situation' : 'It escalates'}
      </Text>
      <Text variant="heading" style={styles.scenario}>
        {prompt}
      </Text>
      <Text variant="bodyStrong" style={styles.question}>
        What would the trained response be?
      </Text>
      <TextArea
        value={value}
        onChangeText={onChange}
        placeholder="One to three sentences."
        hint="Write what you would actually think or say, not what sounds wise."
        testID="round-input"
      />
    </Body>
  );
}

/** The wait is real, so it is framed as pressure building rather than as loading. */
function Waiting({ scoring }: { scoring: boolean }) {
  return (
    <View style={styles.waiting}>
      <ActivityIndicator color={palette.ember} />
      <Text variant="bodyStrong" tone="secondary" style={{ marginTop: spacing.base }}>
        {scoring ? 'Reading all three rounds.' : 'It is not over.'}
      </Text>
    </View>
  );
}

function Verdict({
  result,
  scenario,
  peer,
  responses,
  onDone,
  onShare,
}: {
  result: Extract<SparScoreResult, { crisis: false }>;
  scenario: Scenario;
  peer: string | null;
  responses: string[];
  onDone: () => void;
  onShare: () => void;
}) {
  const tint = verdictColor[result.verdict];
  return (
    <Body
      footer={
        <View style={styles.verdictActions}>
          <Button label="Share" kind="secondary" style={styles.flex1} onPress={onShare} />
          <Button label="Done" onPress={onDone} style={styles.flex1} testID="verdict-done" />
        </View>
      }
    >
      <View style={styles.verdictHead}>
        <VerdictBadge verdict={result.verdict} />
      </View>

      <Card style={[styles.verdictCard, { borderColor: tint.fg }]}>
        <Text variant="micro" caps color={tint.fg}>
          What was Stoic
        </Text>
        <Text variant="body" style={{ marginTop: spacing.xs }}>
          {result.strength}
        </Text>
        <View style={styles.rule} />
        <Text variant="micro" caps tone="faint">
          What you missed
        </Text>
        <Text variant="body" tone="secondary" style={{ marginTop: spacing.xs }}>
          {result.miss}
        </Text>
      </Card>

      {/* A grade with no model to copy teaches nothing. */}
      <Card style={styles.block}>
        <Text variant="micro" tone="ember" caps>
          What the rep looks like
        </Text>
        <Text variant="body" style={{ marginTop: spacing.sm }}>
          {scenario.referenceAnswer}
        </Text>
      </Card>

      {peer ? (
        <Card style={styles.block}>
          <Text variant="micro" tone="faint" caps>
            Someone else, same scenario
          </Text>
          <Text variant="body" tone="secondary" style={{ marginTop: spacing.sm }}>
            {peer}
          </Text>
          <Text variant="caption" tone="faint" style={{ marginTop: spacing.sm }}>
            Anonymous. No profiles, no replies.
          </Text>
        </Card>
      ) : null}

      <Card style={styles.block}>
        <Text variant="micro" tone="faint" caps>
          What you wrote
        </Text>
        {responses.map((r, i) => (
          <View key={i} style={styles.roundRow}>
            <Text variant="caption" tone="faint">
              Round {i + 1}
            </Text>
            <Text variant="body" tone="secondary" style={{ marginTop: 2 }}>
              {r}
            </Text>
          </View>
        ))}
      </Card>
    </Body>
  );
}

function ConceptDelivery({ delivery, onDone }: { delivery: JitDelivery; onDone: () => void }) {
  const { concept, reason } = delivery;
  return (
    <Body footer={<Button label="Got it" onPress={onDone} />}>
      <Text variant="micro" tone="ember" caps>
        {reason === 'missed-target' ? 'This is what caught you' : 'Worth knowing'}
      </Text>
      <Text variant="title" style={{ marginTop: spacing.sm }}>
        {concept.name}
      </Text>
      <Text variant="body" tone="secondary" style={styles.question}>
        {concept.body}
      </Text>
      {concept.quote ? (
        <Card style={styles.block}>
          <Text variant="body" style={{ fontStyle: 'italic' }}>
            "{concept.quote.text}"
          </Text>
          <Text variant="caption" tone="faint" style={{ marginTop: spacing.sm }}>
            {concept.quote.attribution}
          </Text>
        </Card>
      ) : null}
      <Text variant="caption" tone="faint" style={{ marginTop: spacing.base }}>
        Saved to your concept library, under Train.
      </Text>
    </Body>
  );
}

function Body({ children, footer }: { children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <View style={styles.flex}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {children}
      </ScrollView>
      <View style={styles.footer}>{footer}</View>
    </View>
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
  flex: { flex: 1 },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, flexGrow: 1 },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.base },
  scenario: { marginTop: spacing.sm, lineHeight: 30 },
  question: { marginTop: spacing.lg, marginBottom: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  notice: { marginBottom: spacing.base, borderColor: palette.bending, backgroundColor: palette.bendingWash },
  waiting: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  verdictHead: { alignItems: 'center', paddingVertical: spacing.lg },
  verdictCard: { borderWidth: 1, borderRadius: radius.lg },
  block: { marginTop: spacing.md },
  rule: { height: 1, backgroundColor: palette.hairline, marginVertical: spacing.base },
  roundRow: { marginTop: spacing.md },
  verdictActions: { flexDirection: 'row', gap: spacing.md },
  flex1: { flex: 1 },
});
