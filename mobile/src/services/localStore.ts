import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Language } from '@/lib/translations';
import { parseThemePreference, type ThemePreference } from '~/constants/theme';
import { type KnownEvent, parseKnownEvents, withKnownEvent } from './myEventsList';

const THEME_KEY = 'wanwang_theme';
const LANGUAGE_KEY = 'wanwang_lang';
const EVENTS_KEY = 'wanwang_events';

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

export async function loadLanguage(): Promise<Language> {
  try {
    return (await AsyncStorage.getItem(LANGUAGE_KEY)) === 'en' ? 'en' : 'th';
  } catch {
    return 'th';
  }
}

export async function saveLanguage(language: Language): Promise<void> {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
  } catch {
    // The language still applies until the app restarts.
  }
}

export async function loadKnownEvents(): Promise<KnownEvent[]> {
  try {
    return parseKnownEvents(await AsyncStorage.getItem(EVENTS_KEY));
  } catch {
    return [];
  }
}

// Reads and writes run one at a time, so two changes close together cannot lose one of them.
let queue: Promise<unknown> = Promise.resolve();

function changeKnownEvents(change: (events: KnownEvent[]) => KnownEvent[]): Promise<void> {
  const run = queue.then(async () => {
    try {
      await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(change(await loadKnownEvents())));
    } catch {
      // The list is a convenience: the event still opens from its link.
    }
  });
  queue = run;
  return run;
}

export const rememberEvent = (slug: string, title: string) => changeKnownEvents(events => withKnownEvent(events, slug, title));

export const forgetKnownEvent = (slug: string) => changeKnownEvents(events => events.filter(e => e.slug !== slug));

export const setEventHidden = (slug: string, hidden: boolean) =>
  changeKnownEvents(events => events.map(e => (e.slug === slug ? { ...e, hidden } : e)));

export const showAllEvents = () => changeKnownEvents(events => events.map(e => ({ ...e, hidden: false })));
