import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import { track } from '../../src/lib/analytics';
import { useStreak } from '../../src/state/hooks';
import { useMettle } from '../../src/state/store';
import { palette, radius, spacing, verdictColor } from '../../src/theme/tokens';
import { Button, Screen, Text, VerdictBadge } from '../../src/ui';

/**
 * The shareable verdict card.
 *
 * The audience for Mettle is people who already watch Stoic content, so the
 * artefact they would post is the acquisition channel. That makes this a
 * product surface, not a marketing afterthought, which is why it is designed
 * as its own full-bleed screen rather than a button that renders a PNG.
 *
 * Two deliberate choices:
 *
 * - No image export. react-native-view-shot would add a native dependency for
 *   something people already do better themselves: screenshot it. The layout is
 *   built for a phone screenshot, with nothing important near the edges.
 * - The user's own words are the centrepiece, not the verdict. A badge alone is
 *   a score; a badge over something they wrote under pressure is worth posting.
 */
export default function ShareCard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const spar = useMettle((s) => s.spars.find((x) => x.id === id));
  const streak = useStreak();

  if (!spar) {
    return (
      <Screen>
        <Text variant="title">Nothing to share</Text>
      </Screen>
    );
  }

  const tint = verdictColor[spar.verdict];
  const answer = spar.rounds[spar.rounds.length - 1]?.response ?? '';
  const scenario = spar.rounds[0]?.prompt ?? '';

  const share = async () => {
    track({ name: 'share_verdict', verdict: spar.verdict });
    await Share.share({
      message: `${scenario}\n\nWhat I said:\n"${answer}"\n\nVerdict: ${spar.verdict.toUpperCase()}\n\nTrained on Mettle.`,
    });
  };

  return (
    <Screen
      footer={
        <View style={styles.actions}>
          <Button label="Share" onPress={share} style={styles.flex1} />
          <Button label="Close" kind="secondary" onPress={() => router.back()} style={styles.flex1} />
        </View>
      }
    >
      <Pressable style={styles.card} onPress={share} accessibilityRole="button">
        <View style={styles.cardHead}>
          <Text variant="micro" caps tone="ember">
            Mettle
          </Text>
          <Text variant="micro" caps tone="faint">
            Day {streak.current}
          </Text>
        </View>

        <View style={styles.badge}>
          <VerdictBadge verdict={spar.verdict} />
        </View>

        <Text variant="caption" tone="faint" caps>
          The situation
        </Text>
        <Text variant="body" tone="secondary" style={styles.scenario} numberOfLines={4}>
          {scenario}
        </Text>

        <View style={[styles.rule, { backgroundColor: tint.fg }]} />

        <Text variant="caption" tone="faint" caps>
          What I said
        </Text>
        <Text variant="heading" style={styles.answer} numberOfLines={7}>
          "{answer}"
        </Text>

        <View style={styles.footerRow}>
          <Text variant="caption" color={tint.fg}>
            {spar.strength}
          </Text>
        </View>
      </Pressable>

      <Text variant="caption" tone="faint" center style={{ marginTop: spacing.base }}>
        Screenshot this, or tap to share the text.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    marginTop: spacing.base,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    justifyContent: 'center',
  },
  cardHead: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  badge: { alignItems: 'center', marginBottom: spacing.lg },
  scenario: { marginTop: spacing.xs },
  rule: { height: 2, width: 40, marginVertical: spacing.lg, borderRadius: radius.pill },
  answer: { marginTop: spacing.xs, lineHeight: 28 },
  footerRow: { marginTop: spacing.lg },
  actions: { flexDirection: 'row', gap: spacing.md },
  flex1: { flex: 1 },
});
