import { StyleSheet, TextInput, View } from 'react-native';
import { palette, radius, spacing, type } from '../theme/tokens';
import { Text } from './Text';

interface TextAreaProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  /** Shown under the field. Used for the 1-3 sentence guidance in the Arena. */
  hint?: string;
  minHeight?: number;
  autoFocus?: boolean;
  testID?: string;
}

export function TextArea({
  value,
  onChangeText,
  placeholder,
  hint,
  minHeight = 128,
  autoFocus,
  testID,
}: TextAreaProps) {
  return (
    <View>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.slag}
        multiline
        autoFocus={autoFocus}
        textAlignVertical="top"
        style={[styles.input, { minHeight }]}
      />
      {hint ? (
        <Text variant="caption" tone="faint" style={styles.hint}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    ...type.body,
    color: palette.silver,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    padding: spacing.base,
  },
  hint: { marginTop: spacing.sm },
});
