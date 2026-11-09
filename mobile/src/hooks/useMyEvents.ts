import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createEvent, type CreateEventInput, lookupAdminEvents } from '~/services/api';
import { forgetKnownEvent, loadKnownEvents, rememberEvent, setEventHidden, showAllEvents } from '~/services/localStore';
import { mergeMyEvents } from '~/services/myEventsList';
import { forgetEventSecrets, getAdminKey, saveAdminKey } from '~/services/secrets';
import { MY_EVENTS_KEY } from './useEvent';

async function loadMyEvents() {
  const known = await loadKnownEvents();
  const keys = await Promise.all(known.map(async ({ slug }) => ({ slug, adminKey: await getAdminKey(slug) })));
  const held = keys.filter((item): item is { slug: string; adminKey: string } => item.adminKey !== null);

  // A failed lookup may be temporary, so the list still shows what this device knows.
  const summaries = await lookupAdminEvents(held).catch(() => []);
  return mergeMyEvents(known, new Set(held.map(item => item.slug)), summaries);
}

export function useMyEvents() {
  return useQuery({ queryKey: MY_EVENTS_KEY, queryFn: loadMyEvents });
}

export function useMyEventsActions() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: MY_EVENTS_KEY });

  return {
    hide: async (slug: string) => {
      await setEventHidden(slug, true);
      await refresh();
    },
    showHidden: async () => {
      await showAllEvents();
      await refresh();
    },
    /** Only on request, because a 404 from a wrong server must not cost someone their admin key. */
    forget: async (slug: string) => {
      await Promise.all([forgetEventSecrets(slug), forgetKnownEvent(slug)]);
      await refresh();
    },
  };
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateEventInput) => {
      const { event, adminKey } = await createEvent(input);
      // The server only ever hands this out here, so it is stored before the screen changes.
      await saveAdminKey(event.slug, adminKey);
      await rememberEvent(event.slug, event.title);
      return event.slug;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MY_EVENTS_KEY }),
  });
}
