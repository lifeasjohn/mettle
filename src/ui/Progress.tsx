import { StyleSheet, View } from 'react-native';
import { palette, radius } from '../theme/tokens';

interface ProgressProps {
  /** 0 to 1. Values outside the range are clamped. */
  value: number;
  color?: string;
  height?: number;
}

export function Progress({ value, color = palette.ember, height = 6 }: ProgressProps) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0)) * 100;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ now: Math.round(pct), min: 0, max: 100 }}
      style={[styles.track, { height, borderRadius: height / 2 }]}
    >
      <View
        style={[styles.fill, { width: `${pct}%`, backgroundColor: color, borderRadius: height / 2 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { backgroundColor: palette.surfaceHigh, overflow: 'hidden', borderRadius: radius.pill },
  fill: { height: '100%' },
});
