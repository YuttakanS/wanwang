import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteEvent, type EventPatch, updateEvent } from '~/services/api';
import { forgetKnownEvent } from '~/services/localStore';
import { rotateWithProposal } from '~/services/rotation';
import { withAdminKey } from '~/services/secretGuards';
import { forgetEventSecrets } from '~/services/secrets';
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
    // Stores the new key itself, and keeps it through an answer that never arrives.
    mutationFn: () => withAdminKey(slug, key => rotateWithProposal(slug, key), onAdminLost),
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
