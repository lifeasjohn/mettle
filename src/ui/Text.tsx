import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { palette, type } from '../theme/tokens';

type Variant = keyof typeof type;
type Tone = 'primary' | 'secondary' | 'faint' | 'ember' | 'inverse';

const toneColor: Record<Tone, string> = {
  primary: palette.silver,
  secondary: palette.steel,
  faint: palette.slag,
  ember: palette.ember,
  inverse: palette.void,
};

export interface TextProps extends RNTextProps {
  variant?: Variant;
  tone?: Tone;
  /** Uppercases the content. Pair with the `micro` variant for eyebrow labels. */
  caps?: boolean;
  center?: boolean;
  color?: string;
}

export function Text({
  variant = 'body',
  tone = 'primary',
  caps,
  center,
  color,
  style,
  ...rest
}: TextProps) {
  const base = type[variant] as TextStyle;
  return (
    <RNText
      {...rest}
      style={[
        base,
        { color: color ?? toneColor[tone] },
        caps && { textTransform: 'uppercase' },
        center && { textAlign: 'center' },
        style,
      ]}
    />
  );
}
