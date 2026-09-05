import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { palette, radius, spacing } from '../theme/tokens';

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  /** Raises the surface and warms the border. Use for the single active item. */
  accent?: boolean;
  /** Dims and desaturates. Use for locked lessons and spent spars. */
  muted?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Card({ children, onPress, accent, muted, padded = true, style, testID }: CardProps) {
  const composed = [
    styles.base,
    padded && styles.padded,
    accent && styles.accent,
    muted && styles.muted,
    style,
  ];

  if (!onPress) {
    return (
      <View testID={testID} style={composed}>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [...composed, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  padded: { padding: spacing.base },
  accent: { backgroundColor: palette.surfaceRaised, borderColor: palette.emberDim },
  muted: { opacity: 0.45 },
  pressed: { opacity: 0.85 },
});
