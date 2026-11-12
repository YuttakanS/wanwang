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

// A mark that an event's admin key changed and its new link has not been put away yet. It lives here
// rather than in the result of loading the event, which is thrown away when a load is retried or
// cancelled, and it outlasts a restart: until the link is copied, the new key is on this phone only.
// The value says which change it is, so dismissing one notice cannot hide the next.
const unkeptLinkName = (slug: string) => `wanwang_admin_link_unkept_${slug}`;
const unkeptLinks = new Map<string, string>();

export async function markAdminLinkUnkept(slug: string): Promise<void> {
  const mark = String(Date.now());
  unkeptLinks.set(slug, mark);
  try {
    await AsyncStorage.setItem(unkeptLinkName(slug), mark);
  } catch {
    // Held in memory, so the reminder still lasts for this run.
  }
}

export async function getAdminLinkUnkept(slug: string): Promise<string | null> {
  const held = unkeptLinks.get(slug);
  if (held) return held;
  try {
    return await AsyncStorage.getItem(unkeptLinkName(slug));
  } catch {
    return null;
  }
}

/** Resolves to the mark it removed, which can be newer than the one the caller has seen. */
export async function clearAdminLinkUnkept(slug: string): Promise<string | null> {
  const removed = await getAdminLinkUnkept(slug);
  unkeptLinks.delete(slug);
  try {
    await AsyncStorage.removeItem(unkeptLinkName(slug));
  } catch {
    // The reminder comes back after a restart, which is the safe side to fail on.
  }
  return removed;
}

const readKnownEvents = async () => parseKnownEvents(await AsyncStorage.getItem(EVENTS_KEY));

export async function loadKnownEvents(): Promise<KnownEvent[]> {
  try {
    return await readKnownEvents();
  } catch {
    return [];
  }
}

// Reads and writes run one at a time, so two changes close together cannot lose one of them.
let queue: Promise<unknown> = Promise.resolve();

function changeKnownEvents(change: (events: KnownEvent[]) => KnownEvent[]): Promise<void> {
  const run = queue.then(async () => {
    try {
      await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(change(await readKnownEvents())));
    } catch {
      // Nothing is written after a failed read, which would replace the whole list.
      // The list is a convenience: the event still opens from its link.
    }
  });
  queue = run;
  return run;
}

export const rememberEvent = (slug: string, title: string) => changeKnownEvents(events => withKnownEvent(events, slug, title));

export async function forgetKnownEvent(slug: string): Promise<void> {
  await Promise.all([changeKnownEvents(events => events.filter(e => e.slug !== slug)), clearAdminLinkUnkept(slug)]);
}

export const setEventHidden = (slug: string, hidden: boolean) =>
  changeKnownEvents(events => events.map(e => (e.slug === slug ? { ...e, hidden } : e)));

export const showAllEvents = () => changeKnownEvents(events => events.map(e => ({ ...e, hidden: false })));
