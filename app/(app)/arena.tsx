import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { canSpar, todayISO } from '../../src/domain';
import { useUnlocks } from '../../src/state/hooks';
import { useMettle } from '../../src/state/store';
import { palette, spacing } from '../../src/theme/tokens';
import { Button, Card, Screen, Text, VerdictBadge } from '../../src/ui';

export default function Arena() {
  const router = useRouter();
  const entitlement = useMettle((s) => s.entitlement);
  const spars = useMettle((s) => s.spars);
  const unlocks = useUnlocks();

  const permission = canSpar(entitlement);
  const sparredToday = spars.some((s) => s.date === todayISO());
  const history = [...spars].reverse();

  const tally = {
    tempered: spars.filter((s) => s.verdict === 'tempered').length,
    bending: spars.filter((s) => s.verdict === 'bending').length,
    brittle: spars.filter((s) => s.verdict === 'brittle').length,
  };

  return (
    <Screen scroll>
      <View style={styles.head}>
        <Text variant="micro" tone="ember" caps>
          The Arena
        </Text>
        <Text variant="display" style={{ marginTop: 2 }}>
          Spar
        </Text>
        <Text variant="body" tone="secondary" style={{ marginTop: spacing.sm }}>
          Three rounds. Each one uses your last answer against you.
        </Text>
      </View>

      {!unlocks.arenaUnlocked ? (
        <Card>
          <Text variant="bodyStrong">Finish lesson one first.</Text>
          <Text variant="caption" tone="secondary" style={{ marginTop: spacing.xs }}>
            It takes about two minutes and gives you the one distinction everything here is scored against.
          </Text>
          <Button
            label="Go to lesson one"
            kind="secondary"
            style={{ marginTop: spacing.base }}
            onPress={() => router.push('/train')}
          />
        </Card>
      ) : (
        <Card accent>
          <Text variant="micro" tone="ember" caps>
            {sparredToday ? 'Already sparred today' : 'Ready'}
          </Text>
          <Text variant="heading" style={{ marginTop: spacing.sm }}>
            {sparredToday ? 'Go again?' : 'Enter the Arena'}
          </Text>
          <Text variant="caption" tone="secondary" style={{ marginTop: spacing.xs }}>
            {entitlement.status === 'active'
              ? 'Unlimited sparring.'
              : `${permission.remaining} free spar${permission.remaining === 1 ? '' : 's'} left.`}
          </Text>
          <Button
            label={permission.allowed ? 'Begin' : 'Unlock unlimited sparring'}
            style={{ marginTop: spacing.base }}
            onPress={() => router.push(permission.allowed ? '/spar' : '/paywall')}
            testID="arena-begin"
          />
        </Card>
      )}

      {spars.length > 0 ? (
        <>
          <View style={styles.tally}>
            <Tally label="Tempered" value={tally.tempered} color={palette.tempered} />
            <Tally label="Bending" value={tally.bending} color={palette.bending} />
            <Tally label="Brittle" value={tally.brittle} color={palette.brittle} />
          </View>

          <Text variant="micro" tone="faint" caps style={styles.sectionLabel}>
            Record
          </Text>
          {history.map((s) => (
            <Card key={s.id} style={styles.historyCard}>
              <View style={styles.historyTop}>
                <VerdictBadge verdict={s.verdict} size="small" />
                <Text variant="caption" tone="faint">
                  {s.date}
                </Text>
              </View>
              <Text variant="body" tone="secondary" style={{ marginTop: spacing.sm }} numberOfLines={2}>
                {s.rounds[0]?.prompt ?? ''}
              </Text>
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

function Tally({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card style={styles.tallyCard}>
      <Text variant="title" color={color}>
        {value}
      </Text>
      <Text variant="micro" tone="faint" caps style={{ marginTop: 2 }}>
        {label}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { paddingTop: spacing.base, paddingBottom: spacing.lg },
  tally: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  tallyCard: { flex: 1, alignItems: 'center' },
  sectionLabel: { marginTop: spacing.lg, marginBottom: spacing.sm },
  historyCard: { marginBottom: spacing.sm },
  historyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
