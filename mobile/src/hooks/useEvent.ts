import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Participant } from '@/types';
import { ApiError, deleteParticipant, saveParticipant } from '~/services/api';
import { isValidSlug } from '~/services/deepLink';
import { loadEvent } from '~/services/loadEvent';
import { rememberEvent } from '~/services/localStore';
import { forgetEditToken, getAdminKey, getEditToken, saveEditToken } from '~/services/secrets';

export const eventKey = (slug: string) => ['event', slug] as const;
export const MY_EVENTS_KEY = ['my-events'] as const;

export function useEvent(slug: string) {
  return useQuery({
    queryKey: eventKey(slug),
    enabled: isValidSlug(slug),
    queryFn: async ({ client }) => {
      const loaded = await loadEvent(slug);
      if (loaded.adminLinkClaimed) void client.invalidateQueries({ queryKey: MY_EVENTS_KEY });
      return loaded;
    },
  });
}

export interface VoteInput {
  /** The person's existing answer. Left out, the server creates a new one. */
  participantId?: string;
  name: string;
  note: string;
  availability: string[];
}

export function useSaveVote(slug: string, title: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ participantId, ...fields }: VoteInput) => {
      const editToken = participantId ? await getEditToken(slug) : null;
      const saved = await saveParticipant(slug, { id: participantId, editToken, ...fields });
      // The server only ever hands this out here, so it is stored before anything else happens.
      if (saved.editToken) await saveEditToken(slug, saved.editToken);
      await rememberEvent(slug, title);
    },
    onError: async error => {
      // The token no longer matches, so the refetch drops isMine and the next save creates an answer.
      if (error instanceof ApiError && error.status === 403) await forgetEditToken(slug);
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: eventKey(slug) }),
        queryClient.invalidateQueries({ queryKey: MY_EVENTS_KEY }),
      ]),
  });
}

export function useDeleteParticipant(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (participant: Participant) => {
      const [adminKey, editToken] = await Promise.all([getAdminKey(slug), participant.isMine ? getEditToken(slug) : null]);
      // A 403 here also covers an answer already gone, so it says nothing about the admin key.
      await deleteParticipant(slug, participant.id, { adminKey, editToken });
      if (participant.isMine) await forgetEditToken(slug);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: eventKey(slug) }),
  });
}
