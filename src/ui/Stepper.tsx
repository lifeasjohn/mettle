import { StyleSheet, View } from 'react-native';
import { palette, radius, spacing } from '../theme/tokens';

interface StepperProps {
  total: number;
  /** Zero-based. */
  index: number;
}

/** Segmented progress. Reads as forward momentum rather than distance remaining. */
export function Stepper({ total, index }: StepperProps) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[styles.seg, i <= index ? styles.done : styles.todo]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row', gap: 4, paddingVertical: spacing.md },
  seg: { flex: 1, height: 3, borderRadius: radius.pill },
  done: { backgroundColor: palette.ember },
  todo: { backgroundColor: palette.surfaceHigh },
});
