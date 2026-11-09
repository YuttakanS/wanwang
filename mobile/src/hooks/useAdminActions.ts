import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteEvent, type EventPatch, rotateAdminKey, updateEvent } from '~/services/api';
import { forgetKnownEvent } from '~/services/localStore';
import { withAdminKey } from '~/services/secretGuards';
import { forgetEventSecrets, saveAdminKey } from '~/services/secrets';
import { eventKey, MY_EVENTS_KEY } from './useEvent';

/** `onAdminLost` is for the screen, because the panel showing the error goes away along with the rights. */
export function useAdminActions(slug: string, onAdminLost?: () => void) {
  const queryClient = useQueryClient();
  const refreshEvent = () => queryClient.invalidateQueries({ queryKey: eventKey(slug) });

  const update = useMutation({
    mutationFn: (patch: EventPatch) => withAdminKey(slug, key => updateEvent(slug, key, patch), onAdminLost),
    onSettled: () => Promise.all([refreshEvent(), queryClient.invalidateQueries({ queryKey: MY_EVENTS_KEY })]),
  });

  const rotate = useMutation({
    mutationFn: () =>
      withAdminKey(
        slug,
        async key => {
          const newKey = await rotateAdminKey(slug, key);
          // The old key stopped working on the server, so the new one is stored before anything else.
          await saveAdminKey(slug, newKey);
          return newKey;
        },
        onAdminLost,
      ),
    onSettled: refreshEvent,
  });

  const remove = useMutation({
    mutationFn: async () => {
      await withAdminKey(slug, key => deleteEvent(slug, key), onAdminLost);
      await Promise.all([forgetEventSecrets(slug), forgetKnownEvent(slug)]);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MY_EVENTS_KEY }),
    onError: refreshEvent,
  });

  return { update, rotate, remove };
}
