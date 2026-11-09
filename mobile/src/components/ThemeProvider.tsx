import * as SystemUI from 'expo-system-ui';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { resolveColorScheme, themes, type ThemePreference } from '~/constants/theme';
import { ThemeContext } from '~/hooks/useTheme';
import { loadThemePreference, saveThemePreference } from '~/services/localStore';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference | null>(null);

  useEffect(() => {
    let active = true;
    void loadThemePreference().then(saved => {
      if (active) setPreferenceState(saved);
    });
    return () => {
      active = false;
    };
  }, []);

  const scheme = resolveColorScheme(preference ?? 'system', system);
  const colors = themes[scheme];

  // Sets the window colour behind every screen, so screen changes do not flash the other theme.
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.surface);
  }, [colors.surface]);

  const value = useMemo(
    () => ({
      colors,
      scheme,
      preference: preference ?? 'system',
      setPreference: (next: ThemePreference) => {
        setPreferenceState(next);
        void saveThemePreference(next);
      },
    }),
    [colors, scheme, preference],
  );

  // The splash screen stays up until the saved theme is known, so the other theme never flashes.
  if (preference === null) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
