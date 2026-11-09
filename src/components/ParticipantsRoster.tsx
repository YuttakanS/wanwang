'use client';

import React, { useCallback, useState } from 'react';
import ConfirmModal from '@/components/ConfirmModal';
import { WanWangEvent, Participant } from '@/types';
import { useI18n } from '@/lib/i18n';

interface ParticipantsRosterProps {
  event: WanWangEvent;
  participants: Participant[];
  isAdmin: boolean;
  onParticipantDeleted: () => void;
}

export default function ParticipantsRoster({
  event,
  participants,
  isAdmin,
  onParticipantDeleted,
}: ParticipantsRosterProps) {
  const { t } = useI18n();
  const [pendingDelete, setPendingDelete] = useState<Participant | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const closeConfirm = useCallback(() => setPendingDelete(null), []);

  if (participants.length === 0) return null;

  const currentToken = typeof window !== 'undefined'
    ? localStorage.getItem(`wanwang_token_${event.slug}`)
    : null;

  const adminKey = typeof window !== 'undefined'
    ? localStorage.getItem(`wanwang_admin_${event.slug}`)
    : null;

  const handleDelete = async (participant: Participant) => {
    setIsDeleting(true);
    setDeleteFailed(false);

    try {
      const headers: Record<string, string> = {};
      if (adminKey) {
        headers['x-admin-key'] = adminKey;
      }
      if (participant.isMine && currentToken) {
        headers['x-edit-token'] = currentToken;
      }

      const res = await fetch(
        `/api/events/${event.slug}/participants?id=${encodeURIComponent(participant.id)}`,
        {
          method: 'DELETE',
          headers,
        }
      );

      if (!res.ok) throw new Error('Delete failed');

      if (typeof window !== 'undefined' && participant.isMine) {
        localStorage.removeItem(`wanwang_token_${event.slug}`);
        localStorage.removeItem(`wanwang_pid_${event.slug}`);
      }
      onParticipantDeleted();
    } catch (err) {
      console.error('Delete failed:', err);
      setDeleteFailed(true);
    } finally {
      setIsDeleting(false);
      setPendingDelete(null);
    }
  };

  return (
    <div className="bg-surface border-3 border-ink p-5 sm:p-6 space-y-4">
      <div className="border-b-3 border-ink pb-3 flex items-center justify-between">
        <h3 className="text-xl font-bold text-ink">
          {t('rosterTitle', { count: participants.length })}
        </h3>
      </div>

      <div className="divide-y-3 divide-ink">
        {participants.map(p => {
          const isMyEntry = Boolean(p.isMine);
          const canDelete = isMyEntry || isAdmin;
          const count = p.availability?.length || p.availableDates?.length || 0;

          return (
            <div
              key={p.id}
              className={`py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                isMyEntry ? 'bg-accent/20 px-3' : 'px-1'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-ink">
                    {p.name}
                  </span>
                  {isMyEntry && (
                    <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 bg-ink text-surface font-bold">
                      {t('youTag')}
                    </span>
                  )}
                  <span className="font-mono text-xs text-muted">
                    {t('slotsLogged', { count })}
                  </span>
                </div>

                {p.note && (
                  <p className="font-mono text-xs text-muted mt-0.5">
                    {p.note}
                  </p>
                )}
              </div>

              {canDelete && (
                <button
                  type="button"
                  onClick={() => setPendingDelete(p)}
                  className="px-2.5 py-1 bg-surface hover:bg-ink hover:text-surface text-ink border-2 border-ink font-mono text-xs self-start sm:self-center transition-none font-bold"
                >
                  {t('deleteBtn')}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {deleteFailed && (
        <div className="p-3 bg-accent border-2 border-ink text-ink font-mono text-xs motion-shake">
          [ERROR] {t('deleteParticipantFailed')}
        </div>
      )}

      {pendingDelete && (
        <ConfirmModal
          title={t('deleteParticipantConfirmTitle', { name: pendingDelete.name })}
          description={t('deleteParticipantConfirmDesc')}
          cancelLabel={t('confirmCancelBtn')}
          confirmLabel={isDeleting ? t('deleteEventDeleting') : t('deleteParticipantConfirmBtn')}
          isBusy={isDeleting}
          onCancel={closeConfirm}
          onConfirm={() => handleDelete(pendingDelete)}
        />
      )}
    </div>
  );
}
