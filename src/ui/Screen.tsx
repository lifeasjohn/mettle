import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { palette, spacing } from '../theme/tokens';

interface ScreenProps {
  children: ReactNode;
  /** Wraps content in a ScrollView. Off by default: most Mettle screens are one viewport by design. */
  scroll?: boolean;
  /** Horizontal padding. Set false for edge-to-edge surfaces like the skill tree. */
  padded?: boolean;
  edges?: readonly Edge[];
  /** Pinned to the bottom, outside the scroll area. The dominant CTA lives here. */
  footer?: ReactNode;
  style?: ViewStyle;
}

export function Screen({
  children,
  scroll = false,
  padded = true,
  edges = ['top', 'bottom'],
  footer,
  style,
}: ScreenProps) {
  const inner = padded ? { paddingHorizontal: spacing.lg } : null;

  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.scrollContent, inner, style]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, inner, style]}>{children}</View>
      )}
      {footer ? <View style={[styles.footer, inner]}>{footer}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.void },
  flex: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xl, flexGrow: 1 },
  footer: { paddingTop: spacing.md, paddingBottom: spacing.sm },
});
