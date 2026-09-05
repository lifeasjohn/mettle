import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';
import { virtues } from '../content/schema';
import { palette, virtueColor, virtueLabel, type VirtueKey } from '../theme/tokens';

interface RadarProps {
  /** Normalised 0..1 per virtue. */
  values: Record<VirtueKey, number>;
  size?: number;
}

/** Clockwise from the top: wisdom, courage, temperance, justice. */
const ORDER: VirtueKey[] = ['wisdom', 'courage', 'temperance', 'justice'];

export function Radar({ values, size = 220 }: RadarProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 34;

  const point = (index: number, magnitude: number) => {
    const angle = (Math.PI * 2 * index) / ORDER.length - Math.PI / 2;
    // A floor keeps the shape visible at zero, so an untrained radar reads as
    // "nothing yet" rather than as a rendering failure.
    const m = 0.06 + Math.max(0, Math.min(1, magnitude)) * 0.94;
    return [cx + Math.cos(angle) * r * m, cy + Math.sin(angle) * r * m] as const;
  };

  const shape = ORDER.map((v, i) => point(i, values[v]).join(',')).join(' ');

  return (
    <View style={styles.wrap}>
      <Svg width={size} height={size}>
        {[0.25, 0.5, 0.75, 1].map((ring) => (
          <Polygon
            key={ring}
            points={ORDER.map((_, i) => point(i, ring - 0.06).join(',')).join(' ')}
            fill="none"
            stroke={palette.hairline}
            strokeWidth={1}
          />
        ))}

        {ORDER.map((_, i) => {
          const [x, y] = point(i, 1);
          return <Line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={palette.hairline} strokeWidth={1} />;
        })}

        <Polygon points={shape} fill={palette.emberWash} stroke={palette.ember} strokeWidth={2} />

        {ORDER.map((v, i) => {
          const [x, y] = point(i, values[v]);
          return <Circle key={v} cx={x} cy={y} r={4} fill={virtueColor[v]} />;
        })}

        {ORDER.map((v, i) => {
          const [x, y] = point(i, 1.28);
          return (
            <SvgText
              key={`l-${v}`}
              x={x}
              y={y + 4}
              fill={palette.steel}
              fontSize={10}
              fontWeight="700"
              textAnchor="middle"
            >
              {virtueLabel[v].toUpperCase()}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

export { virtues };

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
});
