import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { palette } from '../src/theme/tokens';

/**
 * Mettle is dark-only by design. The forge aesthetic does not survive a light
 * theme, and a training app that changes character with the system setting
 * reads as unserious, so we pin the navigation theme rather than follow the OS.
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

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider value={navTheme}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: palette.void },
            animation: 'fade',
          }}
        />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
