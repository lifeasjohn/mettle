import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { FREE_SPAR_ALLOWANCE } from '../src/domain';
import { PATH_NOUN } from '../src/features/onboarding/steps';
import { useMettle } from '../src/state/store';
import { palette, radius, spacing } from '../src/theme/tokens';
import { Button, Card, Screen, Text } from '../src/ui';

/**
 * The paywall.
 *
 * It fires on the fourth spar, after three complete verdicts have already
 * proven the product, and it names exactly what the user has done rather than
 * making generic promises. The annual price anchors against the weekly one,
 * which is the honest version of a decoy: the weekly plan is real and someone
 * who wants it can take it.
 *
 * Billing is not wired. `subscribe()` flips the local entitlement so the rest
 * of the app can be exercised end to end; RevenueCat drops in behind this
 * screen without changing anything above it.
 */
export default function Paywall() {
  const router = useRouter();
  const profile = useMettle((s) => s.profile);
  const spars = useMettle((s) => s.spars);
  const subscribe = useMettle((s) => s.subscribe);
  const [plan, setPlan] = useState<'annual' | 'weekly'>('annual');
  const [busy, setBusy] = useState(false);

  const tempered = spars.filter((s) => s.verdict === 'tempered').length;
  const noun = profile ? PATH_NOUN[profile.strugglePath].toLowerCase() : 'this';

  const go = async () => {
    setBusy(true);
    await subscribe();
    router.replace('/arena');
  };

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Close">
          <Text variant="body" tone="faint">
            Not now
          </Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text variant="micro" tone="ember" caps>
          {FREE_SPAR_ALLOWANCE} spars done
        </Text>
        <Text variant="display" style={styles.title}>
          Keep sparring.
        </Text>
        <Text variant="body" tone="secondary" style={styles.body}>
          {tempered > 0
            ? `You held ${tempered} of ${spars.length} under pressure. That is a real result, and it is where the training starts rather than ends.`
            : `Three verdicts in. Nobody is tempered at three, which is precisely the point of continuing.`}
        </Text>

        <View style={styles.list}>
          <Line text={`Unlimited sparring, built around ${noun}`} />
          <Line text="Escalations written against your own answers" />
          <Line text="The Pattern: what sets you off, when, and how often" />
          <Line text="Every concept, delivered when you actually miss one" />
        </View>

        <Plan
          selected={plan === 'annual'}
          onPress={() => setPlan('annual')}
          title="Annual"
          price="$59.99 / year"
          sub="$5 a month. Best value."
          badge="Founding member"
        />
        <Plan
          selected={plan === 'weekly'}
          onPress={() => setPlan('weekly')}
          title="Weekly"
          price="$4.99 / week"
          sub="Cancel any time."
        />

        <Text variant="caption" tone="faint" style={styles.small}>
          The five lessons and the Quench stay free, permanently. Your streak does not reset if you
          do not subscribe.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={plan === 'annual' ? 'Start annual' : 'Start weekly'}
          loading={busy}
          onPress={go}
          testID="paywall-subscribe"
        />
      </View>
    </Screen>
  );
}

function Line({ text }: { text: string }) {
  return (
    <View style={styles.lineRow}>
      <View style={styles.bullet} />
      <Text variant="body" style={styles.flex1}>
        {text}
      </Text>
    </View>
  );
}

function Plan({
  selected,
  onPress,
  title,
  price,
  sub,
  badge,
}: {
  selected: boolean;
  onPress: () => void;
  title: string;
  price: string;
  sub: string;
  badge?: string;
}) {
  return (
    <Card accent={selected} onPress={onPress} style={styles.plan}>
      <View style={styles.planTop}>
        <Text variant="bodyStrong" color={selected ? palette.ember : palette.silver}>
          {title}
        </Text>
        {badge ? (
          <Text variant="micro" caps color={palette.ember}>
            {badge}
          </Text>
        ) : null}
      </View>
      <Text variant="heading" style={{ marginTop: spacing.xs }}>
        {price}
      </Text>
      <Text variant="caption" tone="faint" style={{ marginTop: 2 }}>
        {sub}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  title: { marginTop: spacing.sm },
  body: { marginTop: spacing.md },
  list: { marginTop: spacing.lg, gap: spacing.md },
  lineRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: palette.ember,
    marginTop: 9,
  },
  flex1: { flex: 1 },
  plan: { marginTop: spacing.base },
  planTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  small: { marginTop: spacing.lg },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.base },
});
