'use client';

import React, { useCallback, useState } from 'react';
import ConfirmModal from '@/components/ConfirmModal';
import { WanWangEvent, Participant, AnswerValue, FileAnswer, isFileAnswer } from '@/types';
import { formatFileSize } from '@/components/QuestionFields';
import { useI18n } from '@/lib/i18n';

const answerText = (a: AnswerValue | undefined): string =>
  a === undefined ? '' : isFileAnswer(a) ? a.name : Array.isArray(a) ? a.join(', ') : a;

// Spreadsheets run a cell that starts with = + - @ as a formula, and these cells are typed by strangers.
const csvCell = (text: string) => {
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
};

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
  const [fileFailed, setFileFailed] = useState(false);
  const closeConfirm = useCallback(() => setPendingDelete(null), []);
  const questions = event.questions ?? [];

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

  const handleDownload = async (file: FileAnswer) => {
    setFileFailed(false);
    try {
      const headers: Record<string, string> = {};
      if (adminKey) headers['x-admin-key'] = adminKey;
      if (currentToken) headers['x-edit-token'] = currentToken;
      const res = await fetch(`/api/events/${event.slug}/files?path=${encodeURIComponent(file.path)}`, { headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error('Download failed');
      // The link carries a download header, so this saves the file and the page stays put.
      window.location.assign(data.url);
    } catch (err) {
      console.error('Download failed:', err);
      setFileFailed(true);
    }
  };

  const handleExport = () => {
    const header = [t('exportColName'), t('exportColNote'), t('exportColSlots'), ...questions.map(q => q.label)];
    const rows = participants.map(p => [
      p.name,
      p.note ?? '',
      (p.availability || p.availableDates || []).join(' '),
      ...questions.map(q => answerText(p.answers?.[q.id])),
    ]);
    // The BOM makes Excel read Thai text as UTF-8.
    const csv = '\uFEFF' + [header, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${event.slug}-responses.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-surface border-3 border-ink p-5 sm:p-6 space-y-4">
      <div className="border-b-3 border-ink pb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xl font-bold text-ink">
          {t('rosterTitle', { count: participants.length })}
        </h3>
        {isAdmin && (
          <button
            type="button"
            onClick={handleExport}
            className="px-2.5 py-1 bg-surface hover:bg-ink hover:text-surface text-ink border-2 border-ink font-mono text-xs font-bold transition-none cursor-pointer"
          >
            {t('exportCsvBtn')}
          </button>
        )}
      </div>

      {isAdmin && questions.length > 0 && <p className="text-xs text-muted">{t('answersAdminNote')}</p>}

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

                {/* Present only for the creator and for my own entry: the API leaves answers out otherwise. */}
                {p.answers && questions.some(q => p.answers?.[q.id] !== undefined) && (
                  <dl className="mt-2 space-y-1.5 border-l-3 border-ink pl-3">
                    {questions.map(q => {
                      const answer = p.answers?.[q.id];
                      if (answer === undefined) return null;
                      return (
                        <div key={q.id} className="text-xs">
                          <dt className="font-bold text-ink">{q.label}</dt>
                          <dd className="text-ink break-words whitespace-pre-wrap">
                            {isFileAnswer(answer) ? (
                              <button
                                type="button"
                                onClick={() => handleDownload(answer)}
                                className="font-mono underline hover:bg-ink hover:text-surface text-left break-all cursor-pointer"
                              >
                                {answer.name} ({formatFileSize(answer.size)})
                              </button>
                            ) : (
                              answerText(answer)
                            )}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
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

      {fileFailed && (
        <div className="p-3 bg-accent border-2 border-ink text-ink font-mono text-xs motion-shake">
          [ERROR] {t('fileDownloadFailed')}
        </div>
      )}

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
