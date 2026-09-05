import { DarkTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { palette } from '../src/theme/tokens';
import { useMettle } from '../src/state/store';

/**
 * Mettle is dark-only by design. The forge aesthetic does not survive a light
 * theme, and a training app that changes character with the system setting
 * reads as unserious, so the navigation theme is pinned rather than following
 * the OS.
 */
const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: palette.void,
    card: palette.surface,
    text: palette.silver,
    border: palette.hairline,
    primary: palette.ember,
  },
};

function Gate() {
  const hydrated = useMettle((s) => s.hydrated);
  const profile = useMettle((s) => s.profile);
  const hydrate = useMettle((s) => s.hydrate);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    const inOnboarding = segments[0] === 'onboarding';

    // A user without a struggle path has no personalisation to render, so
    // every surface would be wrong. Send them back to pick one.
    if (!profile && !inOnboarding) router.replace('/onboarding');
    else if (profile && inOnboarding) router.replace('/');
  }, [hydrated, profile, segments, router]);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.void, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={palette.ember} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: palette.void },
      }}
    >
      <Stack.Screen name="(app)" />
      <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
      <Stack.Screen name="lesson/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="spar" options={{ presentation: 'modal' }} />
      <Stack.Screen name="quench" options={{ presentation: 'modal' }} />
      <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
      <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
      <Stack.Screen name="share/[id]" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider value={navTheme}>
        <StatusBar style="light" />
        <Gate />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
