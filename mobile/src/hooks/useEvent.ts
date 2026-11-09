import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Participant } from '@/types';
import { ApiError, deleteParticipant, saveParticipant } from '~/services/api';
import { isValidSlug } from '~/services/deepLink';
import { loadEvent } from '~/services/loadEvent';
import { rememberEvent } from '~/services/localStore';
import { isEditTokenRejected } from '~/services/secretGuards';
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

/** Thrown when the answer's token cannot be read, so nothing is sent that the server would refuse. */
export const EDIT_TOKEN_UNAVAILABLE = 409;

export function useSaveVote(slug: string, title: string) {
  const queryClient = useQueryClient();
  return useMutation({
    /** Resolves to the answer's id, so a later save updates it even if the refetch below fails. */
    mutationFn: async ({ participantId, ...fields }: VoteInput): Promise<string> => {
      const editToken = participantId ? await getEditToken(slug) : null;
      if (participantId && !editToken) throw new ApiError('Edit token unavailable', EDIT_TOKEN_UNAVAILABLE);

      let saved: Participant;
      try {
        saved = await saveParticipant(slug, { id: participantId, editToken, ...fields });
      } catch (error) {
        // Forgetting a rejected token makes the refetch drop isMine, so the next save creates an answer.
        if (error instanceof ApiError && error.status === 403 && editToken && (await isEditTokenRejected(slug, editToken))) {
          await forgetEditToken(slug);
        }
        throw error;
      }

      // The server only ever hands this out here, so it is stored before anything else happens.
      if (saved.editToken) await saveEditToken(slug, saved.editToken);
      await rememberEvent(slug, title);
      return saved.id;
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
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: eventKey(slug) }),
        queryClient.invalidateQueries({ queryKey: MY_EVENTS_KEY }),
      ]),
  });
}
