import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { palette, spacing } from '../theme/tokens';
import { Text } from './Text';

interface FlameProps {
  /** Current streak in days. Zero renders cold (grey), which is the point. */
  days: number;
  size?: number;
}

/**
 * The streak indicator. Cold and grey at zero, ember once the streak is alive.
 * Deliberately not celebratory at zero: Mettle does not congratulate you for nothing.
 */
export function Flame({ days, size = 22 }: FlameProps) {
  const alive = days > 0;
  const fill = alive ? palette.ember : palette.slag;

  return (
    <View style={styles.row} accessibilityLabel={`${days} day streak`}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d="M12 2c.6 3.2-1.1 4.6-2.6 6C7.6 9.6 6 11.2 6 14a6 6 0 0 0 12 0c0-2.4-1.2-4.2-2.4-5.6-.5 1-1.2 1.7-2 2 .5-2.6-.6-6-1.6-8.4Z"
          fill={fill}
        />
        {alive ? (
          <Path
            d="M12 12c.4 1.6-.6 2.3-1.2 3-.5.6-.8 1.2-.8 2a2 2 0 0 0 4 0c0-1.2-.7-2-1.3-2.7-.4-.5-.7-1.2-.7-2.3Z"
            fill={palette.void}
            opacity={0.55}
          />
        ) : null}
      </Svg>
      <Text variant="bodyStrong" color={fill} style={styles.count}>
        {days}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  count: { marginLeft: spacing.xs },
});
