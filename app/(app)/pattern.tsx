import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { chipById } from '../../src/content';
import { normaliseRadar, radarHasEnoughData } from '../../src/domain';
import { usePattern, useRadar, useStreak } from '../../src/state/hooks';
import { useMettle } from '../../src/state/store';
import { palette, spacing, verdictColor } from '../../src/theme/tokens';
import { Card, Chip, Radar, Screen, Text, VerdictBadge } from '../../src/ui';

/**
 * The Pattern.
 *
 * Two views of the same history: what it means, and what happened. The
 * findings view leads because "you completed 15 lessons" is worthless and
 * "Thursday is always the worst" is a reason to keep paying.
 *
 * Nothing here claims an outcome. Every line is framed as what the user
 * reported, because that is genuinely all the app knows.
 */
export default function Pattern() {
  const [view, setView] = useState<'findings' | 'timeline'>('findings');
  const report = usePattern();
  const radar = useRadar();
  const streak = useStreak();
  const quench = useMettle((s) => s.quenchEntries);
  const spars = useMettle((s) => s.spars);

  const normalised = normaliseRadar(radar);
  const enough = radarHasEnoughData(radar);

  const timeline = [
    ...quench.map((q) => ({ kind: 'quench' as const, date: q.date, data: q })),
    ...spars.map((s) => ({ kind: 'spar' as const, date: s.date, data: s })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <Screen scroll>
      <View style={styles.head}>
        <Text variant="micro" tone="ember" caps>
          The Pattern
        </Text>
        <Text variant="display" style={{ marginTop: 2 }}>
          {streak.longest > 0 ? `${streak.longest} day best` : 'Your record'}
        </Text>
      </View>

      <View style={styles.toggle}>
        <Chip label="Findings" selected={view === 'findings'} onPress={() => setView('findings')} />
        <Chip label="Timeline" selected={view === 'timeline'} onPress={() => setView('timeline')} />
      </View>

      {view === 'findings' ? (
        <>
          <Card style={styles.block}>
            <Text variant="micro" tone="faint" caps>
              Virtue radar · last 30 days
            </Text>
            <View style={{ marginTop: spacing.base }}>
              <Radar values={normalised} />
            </View>
            <Text variant="caption" tone="faint" style={{ marginTop: spacing.sm }}>
              {enough
                ? 'Built from Arena verdicts and what you held to, not from how much you used the app.'
                : 'Not enough evidence yet. Spar and run the Quench, and this fills in.'}
            </Text>
          </Card>

          {report.hasEnoughData ? (
            report.insights.length > 0 ? (
              report.insights.map((i) => (
                <Card key={i.id} style={styles.block}>
                  <View style={styles.insightTop}>
                    <Text variant="micro" tone="faint" caps>
                      {i.kind}
                    </Text>
                    {i.confidence === 'emerging' ? (
                      <Text variant="micro" caps color={palette.bending}>
                        Emerging
                      </Text>
                    ) : null}
                  </View>
                  <Text variant="bodyStrong" style={{ marginTop: spacing.sm }}>
                    {i.headline}
                  </Text>
                  <Text variant="caption" tone="secondary" style={{ marginTop: spacing.xs }}>
                    {i.detail}
                  </Text>
                </Card>
              ))
            ) : (
              <Card style={styles.block}>
                <Text variant="bodyStrong">Nothing has repeated yet.</Text>
                <Text variant="caption" tone="secondary" style={{ marginTop: spacing.xs }}>
                  That is a real finding, not a gap. Keep logging and Mettle will say something the
                  moment it can say it honestly.
                </Text>
              </Card>
            )
          ) : (
            <Card style={styles.block}>
              <Text variant="bodyStrong">
                {report.entriesNeeded} more evening{report.entriesNeeded === 1 ? '' : 's'}.
              </Text>
              <Text variant="caption" tone="secondary" style={{ marginTop: spacing.xs }}>
                Mettle will not guess at your patterns from three data points. Run the Quench and
                this fills in with what actually keeps happening.
              </Text>
            </Card>
          )}
        </>
      ) : (
        <>
          {timeline.length === 0 ? (
            <Card style={styles.block}>
              <Text variant="bodyStrong">Nothing logged yet.</Text>
            </Card>
          ) : null}

          {timeline.map((item, idx) => (
            <Card key={`${item.kind}-${idx}`} style={styles.block}>
              <View style={styles.insightTop}>
                {item.kind === 'spar' ? (
                  <VerdictBadge verdict={item.data.verdict} size="small" />
                ) : (
                  <Text variant="micro" tone="ember" caps>
                    Quench
                  </Text>
                )}
                <Text variant="caption" tone="faint">
                  {item.date}
                </Text>
              </View>

              {item.kind === 'quench' ? (
                <>
                  <View style={styles.chipRow}>
                    {[...item.data.heldChipIds, ...item.data.ranChipIds].map((id) => (
                      <Text key={id} variant="caption" tone="secondary">
                        {chipById.get(id)?.label ?? id}
                        {'  '}
                      </Text>
                    ))}
                  </View>
                  <Text
                    variant="caption"
                    color={verdictColor.tempered.fg}
                    style={{ marginTop: spacing.sm }}
                  >
                    {item.data.sealLine}
                  </Text>
                </>
              ) : (
                <Text variant="body" tone="secondary" style={{ marginTop: spacing.sm }} numberOfLines={2}>
                  {item.data.strength}
                </Text>
              )}
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { paddingTop: spacing.base, paddingBottom: spacing.base },
  toggle: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.base },
  block: { marginBottom: spacing.md },
  insightTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm },
});
