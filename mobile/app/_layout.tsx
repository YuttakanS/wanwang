import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ReducedMotionConfig, ReduceMotion } from 'react-native-reanimated';
import { I18nProvider } from '~/components/I18nProvider';
import { ThemeProvider } from '~/components/ThemeProvider';
import { fontAssets } from '~/constants/fonts';
import { useTheme } from '~/hooks/useTheme';
import { queryClient } from '~/services/queryClient';

void SplashScreen.preventAutoHideAsync();

// A link can open an event directly. This keeps the home screen behind it, so back still works.
export const unstable_settings = { anchor: 'index' };

function AppShell() {
  const { colors, scheme } = useTheme();
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  // A font that fails to load falls back to the system font, which is better than a stuck splash screen.
  const ready = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  if (!ready) return null;

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }} />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ReducedMotionConfig mode={ReduceMotion.System} />
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <I18nProvider>
            <AppShell />
          </I18nProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
