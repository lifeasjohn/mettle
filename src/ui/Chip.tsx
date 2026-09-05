import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { palette, radius, spacing } from '../theme/tokens';
import { Text } from './Text';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  /** Overrides the selected accent. Used to tint Quench chips by virtue. */
  accentColor?: string;
  style?: ViewStyle;
  testID?: string;
}

export function Chip({
  label,
  selected,
  onPress,
  disabled,
  accentColor,
  style,
  testID,
}: ChipProps) {
  const accent = accentColor ?? palette.ember;
  const body = (
    <Text variant="bodyStrong" color={selected ? accent : palette.silver}>
      {label}
    </Text>
  );

  const composed: ViewStyle[] = [
    styles.base,
    selected ? { borderColor: accent, backgroundColor: `${accent}1F` } : styles.resting,
    disabled ? styles.disabled : {},
    style ?? {},
  ];

  if (!onPress) return <View style={composed} testID={testID}>{body}</View>;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [...composed, pressed && !disabled && styles.pressed]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  resting: { borderColor: palette.border, backgroundColor: palette.surfaceRaised },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.8 },
});
