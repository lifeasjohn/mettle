import { Linking, StyleSheet, View } from 'react-native';
import { palette, spacing } from '../theme/tokens';
import { Button } from './Button';
import { Card } from './Card';
import { Screen } from './Screen';
import { Text } from './Text';

/**
 * Shown whenever either layer of the crisis guardrail fires.
 *
 * The game frame is dropped entirely: no verdict, no score, no XP, no streak
 * credit, and nothing is stored. The tone shifts completely out of the sparring
 * register, because a training voice is the wrong voice here.
 *
 * Resources are deliberately generic. The app does not know the user's country,
 * so pointing at a directory that does is more useful and more honest than
 * listing numbers that may not work where they are.
 */
export function CrisisScreen({ onDismiss }: { onDismiss: () => void }) {
  return (
    <Screen
      footer={<Button label="Back to Mettle" kind="secondary" onPress={onDismiss} />}
    >
      <View style={styles.body}>
        <Text variant="title">Let's stop the exercise here.</Text>
        <Text variant="body" tone="secondary" style={styles.para}>
          Something in what you wrote sounds heavier than training. Mettle is not
          the right tool for it, and pretending otherwise would not help you.
        </Text>
        <Text variant="body" tone="secondary" style={styles.para}>
          Please talk to someone who can actually help. If you are in immediate
          danger, contact your local emergency services.
        </Text>

        <Card style={styles.card} onPress={() => void Linking.openURL('https://findahelpline.com')}>
          <Text variant="bodyStrong" tone="ember">
            findahelpline.com
          </Text>
          <Text variant="caption" tone="secondary" style={{ marginTop: spacing.xs }}>
            Free, confidential support lines, listed by country.
          </Text>
        </Card>

        <Text variant="caption" tone="faint" style={styles.para}>
          Nothing from this session was scored or saved.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, justifyContent: 'center' },
  para: { marginTop: spacing.base },
  card: { marginTop: spacing.lg, borderColor: palette.emberDim },
});
