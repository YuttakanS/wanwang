import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError, deleteEvent, type EventPatch, rotateAdminKey, updateEvent } from '~/services/api';
import { forgetKnownEvent } from '~/services/localStore';
import { forgetAdminKeyIfCurrent, forgetEventSecrets, getAdminKey, saveAdminKey } from '~/services/secrets';
import { eventKey, MY_EVENTS_KEY } from './useEvent';

/** A 403 from these endpoints means the key is no longer valid, so the person drops to a normal voter. */
async function withAdminKey<T>(slug: string, action: (adminKey: string) => Promise<T>): Promise<T> {
  const adminKey = await getAdminKey(slug);
  if (!adminKey) throw new ApiError('Missing admin key', 403);
  try {
    return await action(adminKey);
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) await forgetAdminKeyIfCurrent(slug, adminKey);
    throw error;
  }
}

export function useAdminActions(slug: string) {
  const queryClient = useQueryClient();
  const refreshEvent = () => queryClient.invalidateQueries({ queryKey: eventKey(slug) });

  const update = useMutation({
    mutationFn: (patch: EventPatch) => withAdminKey(slug, key => updateEvent(slug, key, patch)),
    onSettled: () => Promise.all([refreshEvent(), queryClient.invalidateQueries({ queryKey: MY_EVENTS_KEY })]),
  });

  const rotate = useMutation({
    mutationFn: () =>
      withAdminKey(slug, async key => {
        // The old key stopped working on the server, so the new one is stored before anything else.
        await saveAdminKey(slug, await rotateAdminKey(slug, key));
      }),
    onSettled: refreshEvent,
  });

  const remove = useMutation({
    mutationFn: async () => {
      await withAdminKey(slug, key => deleteEvent(slug, key));
      await Promise.all([forgetEventSecrets(slug), forgetKnownEvent(slug)]);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MY_EVENTS_KEY }),
    onError: refreshEvent,
  });

  return { update, rotate, remove };
}
