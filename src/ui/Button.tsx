import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { palette, radius, spacing } from '../theme/tokens';
import { Text } from './Text';

type Kind = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  kind?: Kind;
  disabled?: boolean;
  loading?: boolean;
  /** Small print under the label. Used on the paywall for price framing. */
  sublabel?: string;
  style?: ViewStyle;
  testID?: string;
}

export function Button({
  label,
  onPress,
  kind = 'primary',
  disabled,
  loading,
  sublabel,
  style,
  testID,
}: ButtonProps) {
  const inert = disabled || loading;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inert }}
      onPress={inert ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        kindStyle[kind],
        pressed && !inert && styles.pressed,
        inert && styles.inert,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={kind === 'primary' ? palette.void : palette.silver} />
      ) : (
        <View>
          <Text variant="bodyStrong" center color={labelColor[kind]}>
            {label}
          </Text>
          {sublabel ? (
            <Text variant="caption" center color={labelColor[kind]} style={styles.sublabel}>
              {sublabel}
            </Text>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

const labelColor: Record<Kind, string> = {
  primary: palette.void,
  secondary: palette.silver,
  ghost: palette.steel,
  danger: palette.brittle,
};

const kindStyle: Record<Kind, ViewStyle> = {
  primary: { backgroundColor: palette.ember },
  secondary: { backgroundColor: palette.surfaceHigh, borderWidth: 1, borderColor: palette.border },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: 'transparent', borderWidth: 1, borderColor: palette.brittle },
};

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  inert: { opacity: 0.38 },
  sublabel: { marginTop: 2, opacity: 0.75 },
});
