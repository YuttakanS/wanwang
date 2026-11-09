import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseThemePreference, type ThemePreference } from '~/constants/theme';

const THEME_KEY = 'wanwang_theme';

export async function loadThemePreference(): Promise<ThemePreference> {
  try {
    return parseThemePreference(await AsyncStorage.getItem(THEME_KEY));
  } catch {
    return 'system';
  }
}

export async function saveThemePreference(preference: ThemePreference): Promise<void> {
  try {
    if (preference === 'system') await AsyncStorage.removeItem(THEME_KEY);
    else await AsyncStorage.setItem(THEME_KEY, preference);
  } catch {
    // The theme still applies until the app restarts.
  }
}
