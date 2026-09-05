import { Tabs } from 'expo-router/js-tabs';
import { StyleSheet, View, type ColorValue } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { palette, type } from '../../src/theme/tokens';

/**
 * Four tabs, each load-bearing.
 *
 * The Arena sits in the middle because it is the differentiated feature and the
 * permanent daily loop; burying it behind a menu would repeat the mistake the
 * original plan made by locking it until lesson 5. Profile is not a tab: it is
 * settings, and settings is not a daily destination.
 */
export default function AppTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.bar,
        tabBarActiveTintColor: palette.ember,
        tabBarInactiveTintColor: palette.slag,
        tabBarLabelStyle: styles.label,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Today', tabBarIcon: ({ color }) => <TodayIcon color={color} /> }}
      />
      <Tabs.Screen
        name="arena"
        options={{ title: 'Arena', tabBarIcon: ({ color }) => <ArenaIcon color={color} /> }}
      />
      <Tabs.Screen
        name="train"
        options={{ title: 'Train', tabBarIcon: ({ color }) => <TrainIcon color={color} /> }}
      />
      <Tabs.Screen
        name="pattern"
        options={{ title: 'Pattern', tabBarIcon: ({ color }) => <PatternIcon color={color} /> }}
      />
    </Tabs>
  );
}

const S = 24;
const icon = (children: React.ReactNode) => (
  <View style={styles.icon}>
    <Svg width={S} height={S} viewBox="0 0 24 24">
      {children}
    </Svg>
  </View>
);

const TodayIcon = ({ color }: { color: ColorValue }) =>
  icon(
    <>
      <Circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth="1.8" fill="none" />
      <Path d="M12 7.5V12l3 2" stroke={color} strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </>,
  );

/** Crossed blades: sparring, not meditation. Thicker strokes read as hilts. */
const ArenaIcon = ({ color }: { color: ColorValue }) =>
  icon(
    <>
      <Path
        d="M6.2 4.6L17.4 16M17.8 4.6L6.6 16"
        stroke={color}
        strokeWidth="1.7"
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M4.6 15.4l3.2 3.2M19.4 15.4l-3.2 3.2"
        stroke={color}
        strokeWidth="2.6"
        strokeLinecap="round"
        fill="none"
      />
    </>,
  );

/** An anvil: slab with a horn, waist, and splayed base. */
const TrainIcon = ({ color }: { color: ColorValue }) =>
  icon(
    <>
      <Path d="M3.5 8.2H15l4.8 2.3L15 12.8H3.5Z" fill={color} />
      <Path
        d="M8.3 12.8v2.1L5.4 19.6h9.2l-2.9-4.7v-2.1"
        stroke={color}
        strokeWidth="1.7"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
    </>,
  );

const PatternIcon = ({ color }: { color: ColorValue }) =>
  icon(
    <>
      <Path d="M4 18l4-6 4 3 4-8 4 5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>,
  );

const styles = StyleSheet.create({
  bar: {
    backgroundColor: palette.surface,
    borderTopColor: palette.hairline,
    borderTopWidth: 1,
    height: 84,
    paddingTop: 8,
  },
  label: { ...type.micro, textTransform: 'uppercase' },
  icon: { alignItems: 'center', justifyContent: 'center' },
});
