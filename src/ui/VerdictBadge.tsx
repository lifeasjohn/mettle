import { StyleSheet, View } from 'react-native';
import { radius, spacing, verdictColor, type VerdictKey } from '../theme/tokens';
import { Text } from './Text';

const label: Record<VerdictKey, string> = {
  tempered: 'Tempered',
  bending: 'Bending',
  brittle: 'Brittle',
};

interface VerdictBadgeProps {
  verdict: VerdictKey;
  /** Large is the verdict screen. Small is the timeline and share card. */
  size?: 'small' | 'large';
}

export function VerdictBadge({ verdict, size = 'large' }: VerdictBadgeProps) {
  const { fg, wash } = verdictColor[verdict];
  const large = size === 'large';

  return (
    <View style={[styles.base, large ? styles.large : styles.small, { backgroundColor: wash, borderColor: fg }]}>
      <Text variant={large ? 'heading' : 'micro'} caps={!large} color={fg}>
        {label[verdict]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderWidth: 1, borderRadius: radius.pill, alignSelf: 'flex-start' },
  large: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  small: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
});
