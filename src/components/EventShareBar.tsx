'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { WanWangEvent, Participant } from '@/types';
import { generateShareMessage, participantsHaveSlots } from '@/lib/timeUtils';
import { buildShareUrl, ShareTarget } from '@/lib/shareTargets';
import { useRouter } from 'next/navigation';
import {
  buildAdminLink,
  clearPendingRotation,
  forgetEvent,
  getPendingRotation,
  getStoredAdminKey,
  setPendingRotation,
} from '@/lib/adminAccess';
import { newAdminKey, requestRotation } from '@/lib/rotateAdminKey';
import { copyText } from '@/lib/clipboard';
import ConfirmModal from '@/components/ConfirmModal';
import EditEventForm from '@/components/EditEventForm';
import { useI18n } from '@/lib/i18n';

interface EventShareBarProps {
  event: WanWangEvent;
  participants: Participant[];
  isAdmin: boolean;
  onEventUpdated: () => void;
  onAdminKeyRotated: (newKey: string) => void;
}

export default function EventShareBar({
  event,
  participants,
  isAdmin,
  onEventUpdated,
  onAdminKeyRotated,
}: EventShareBarProps) {
  const { lang, t } = useI18n();

  const [openPanel, setOpenPanel] = useState<'share' | 'admin' | null>(null);
  const togglePanel = (panel: 'share' | 'admin') =>
    setOpenPanel(current => (current === panel ? null : panel));
  const panelIdBase = useId();
  const sharePanelId = `${panelIdBase}-share`;
  const adminPanelId = `${panelIdBase}-admin`;

  const [canNativeShare, setCanNativeShare] = useState(false);
  useEffect(() => {
    setCanNativeShare(typeof navigator.share === 'function');
  }, []);

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedAdminLink, setCopiedAdminLink] = useState(false);
  const [manualCopy, setManualCopy] = useState<{ text: string; isAdminLink: boolean } | null>(null);
  const manualCopyRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    manualCopyRef.current?.focus();
  }, [manualCopy]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [rotateFailed, setRotateFailed] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const closeDeleteConfirm = useCallback(() => setConfirmingDelete(false), []);
  const [isEditing, setIsEditing] = useState(false);
  const [confirmingRotate, setConfirmingRotate] = useState(false);
  const closeRotateConfirm = useCallback(() => setConfirmingRotate(false), []);
  const router = useRouter();

  const getEventUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/e/${event.slug}`;
    }
    return `https://wanwang.me/e/${event.slug}`;
  };

  const copyWithFeedback = async (
    text: string,
    setCopied: (copied: boolean) => void,
    isAdminLink = false
  ) => {
    if (await copyText(text)) {
      setManualCopy(null);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setManualCopy({ text, isAdminLink });
    }
  };

  const handleCopyLink = () => copyWithFeedback(getEventUrl(), setCopiedLink);

  const handleCopySummaryText = () =>
    copyWithFeedback(generateShareMessage(event, participants, getEventUrl(), lang), setCopiedText);

  const handleNativeShare = async () => {
    const url = getEventUrl();

    try {
      await navigator.share({
        title: `วันว่าง: ${event.title}`,
        text: generateShareMessage(event, participants, url, lang),
        url,
      });
    } catch (err) {
      // AbortError means the user closed the share sheet.
      if ((err as Error).name !== 'AbortError') console.error('Share failed:', err);
    }
  };

  // Built on click because the summary scans every slot, which is slow on long events.
  const handleShareTo = (target: ShareTarget) => {
    const shareUrl = buildShareUrl(target, event, participants, getEventUrl(), lang);
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopyAdminLink = async () => {
    const adminKey = event.adminKey || getStoredAdminKey(event.slug);

    if (adminKey) {
      await copyWithFeedback(buildAdminLink(event.slug, adminKey), setCopiedAdminLink, true);
    }
  };

  const handleRotateAdminLink = async () => {
    const adminKey = event.adminKey || getStoredAdminKey(event.slug);
    if (!adminKey) return;

    setIsUpdating(true);
    setRotateFailed(false);

    try {
      // A key left from an attempt whose answer never arrived is sent again, so both attempts
      // agree on the result whichever one the server saw.
      const newKey = getPendingRotation(event.slug) ?? newAdminKey();
      setPendingRotation(event.slug, newKey);
      const outcome = await requestRotation(event.slug, adminKey, newKey);
      if (outcome.status === 'done') {
        clearPendingRotation(event.slug);
        onAdminKeyRotated(outcome.adminKey);
      } else {
        if (outcome.status === 'refused') clearPendingRotation(event.slug);
        setRotateFailed(true);
      }
    } catch (err) {
      console.error('Rotate admin key failed:', err);
      setRotateFailed(true);
    } finally {
      setIsUpdating(false);
      setConfirmingRotate(false);
    }
  };

  const handleDeleteEvent = async () => {
    const adminKey = event.adminKey || getStoredAdminKey(event.slug);
    if (!adminKey) return;

    setIsUpdating(true);
    setDeleteFailed(false);

    try {
      const res = await fetch(`/api/events/${event.slug}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': adminKey },
      });
      if (!res.ok) throw new Error('Delete failed');
      forgetEvent(event.slug);
      router.push('/');
    } catch (err) {
      console.error('Delete event failed:', err);
      setDeleteFailed(true);
      setIsUpdating(false);
      setConfirmingDelete(false);
    }
  };

  const handleToggleClosed = async () => {
    const adminKey = typeof window !== 'undefined'
      ? localStorage.getItem(`wanwang_admin_${event.slug}`) || event.adminKey
      : event.adminKey;

    if (!adminKey) return;
    setIsUpdating(true);

    try {
      await fetch(`/api/events/${event.slug}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({
          isClosed: !event.isClosed,
        }),
      });
      onEventUpdated();
    } catch (err) {
      console.error('Update status failed:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="border-t-3 border-ink pt-4 space-y-3">
      {/* Collapsed by default so people opening the link reach the voting form straight away. */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-expanded={openPanel === 'share'}
          aria-controls={sharePanelId}
          onClick={() => togglePanel('share')}
          className="btn-primary-raw gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold"
        >
          {t('shareToggleBtn')}
          <ChevronDown aria-hidden="true" size={16} className={openPanel === 'share' ? 'rotate-180' : ''} />
        </button>

        {isAdmin && (
          <button
            type="button"
            aria-expanded={openPanel === 'admin'}
            aria-controls={adminPanelId}
            onClick={() => togglePanel('admin')}
            className="btn-secondary-raw gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold"
          >
            {t('manageToggleBtn')}
            <ChevronDown aria-hidden="true" size={16} className={openPanel === 'admin' ? 'rotate-180' : ''} />
          </button>
        )}
      </div>

      {openPanel === 'share' && (
        <div id={sharePanelId} className="flex flex-wrap items-center gap-2 motion-enter">
          {/* The system share sheet reaches every installed app, including Messenger. */}
          {canNativeShare && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="btn-secondary-raw px-3 py-2 text-xs font-semibold"
            >
              {t('shareNativeBtn')}
            </button>
          )}

          <button
            type="button"
            onClick={() => handleShareTo('line')}
            className="btn-secondary-raw px-3 py-2 text-xs font-semibold"
          >
            {t('shareLineBtn')}
          </button>

          <button
            type="button"
            onClick={() => handleShareTo('whatsapp')}
            className="btn-secondary-raw px-3 py-2 text-xs font-semibold"
          >
            {t('shareWhatsappBtn')}
          </button>

          {/* Copy Summary Text */}
          <button
            type="button"
            onClick={handleCopySummaryText}
            className="btn-secondary-raw px-3 py-2 text-xs font-semibold"
          >
            {copiedText ? t('copySummaryDone') : t('copySummaryBtn')}
          </button>

          {/* Copy Link Only */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="btn-secondary-raw px-3 py-2 text-xs font-semibold"
          >
            {copiedLink ? t('copyLinkDone') : t('copyLinkBtn')}
          </button>
        </div>
      )}

      {/* Organizer / Admin secret UX */}
      {isAdmin && openPanel === 'admin' && (
        <div id={adminPanelId} className="flex flex-wrap items-center gap-2 motion-enter">
          <span className="font-mono text-xs font-bold px-2 py-1 bg-sunken border-2 border-ink text-ink">
            {t('adminVerifiedBadge')}
          </span>

          <button
            type="button"
            aria-expanded={isEditing}
            disabled={isUpdating}
            onClick={() => setIsEditing(editing => !editing)}
            className="px-2 py-1 bg-surface hover:bg-ink hover:text-surface border-2 border-ink font-mono text-xs transition-none"
          >
            {t('editEventBtn')}
          </button>

          <button
            type="button"
            onClick={handleCopyAdminLink}
            className="px-2 py-1 bg-surface hover:bg-ink hover:text-surface border-2 border-ink font-mono text-xs transition-none"
          >
            {copiedAdminLink ? t('copyAdminLinkDone') : t('copyAdminLinkBtn')}
          </button>

          <button
            type="button"
            disabled={isUpdating}
            onClick={() => setConfirmingRotate(true)}
            className="px-2 py-1 bg-surface hover:bg-ink hover:text-surface border-2 border-ink font-mono text-xs transition-none"
          >
            {t('rotateAdminBtn')}
          </button>

          <button
            type="button"
            disabled={isUpdating}
            onClick={handleToggleClosed}
            className={`px-2.5 py-1 font-mono text-xs font-bold border-2 border-ink transition-none ${
              event.isClosed
                ? 'bg-accent text-ink hover:bg-ink hover:text-on-ink-accent'
                : 'bg-ink text-surface hover:bg-surface hover:text-ink'
            }`}
          >
            {event.isClosed ? t('reopenVotingBtn') : t('closeVotingBtn')}
          </button>

          <button
            type="button"
            disabled={isUpdating}
            onClick={() => setConfirmingDelete(true)}
            className="px-2.5 py-1 font-mono text-xs font-bold border-2 border-black bg-[#D00000] text-white hover:bg-black hover:text-[#FF0000] transition-none"
          >
            {t('deleteEventBtn')}
          </button>
        </div>
      )}

      {isAdmin && openPanel === 'admin' && isEditing && (
        <EditEventForm
          event={event}
          hasVotes={participantsHaveSlots(participants)}
          onCancel={() => setIsEditing(false)}
          onSaved={() => {
            setIsEditing(false);
            onEventUpdated();
          }}
        />
      )}

      {manualCopy && (
        <div className="p-3 bg-accent border-2 border-ink text-ink space-y-2 motion-shake">
          <p role="alert" className="font-mono text-xs">
            [ERROR] {t('copyManualNotice')}
          </p>
          {manualCopy.isAdminLink && <p className="text-xs">{t('adminNoticeWarning')}</p>}
          <textarea
            ref={manualCopyRef}
            readOnly
            aria-label={t('copyManualLabel')}
            rows={manualCopy.text.includes('\n') ? 6 : 2}
            value={manualCopy.text}
            onFocus={e => e.target.select()}
            className="w-full px-3 py-2 bg-surface border-2 border-ink text-ink font-mono text-xs focus:outline-none focus:ring-2 focus:ring-ink"
          />
          <button
            type="button"
            onClick={() => setManualCopy(null)}
            className="btn-secondary-raw px-3 py-1.5 text-xs font-semibold"
          >
            {t('copyManualDismiss')}
          </button>
        </div>
      )}

      {rotateFailed && (
        <div className="p-3 bg-accent border-2 border-ink text-ink font-mono text-xs motion-shake">
          [ERROR] {t('rotateAdminFailed')}
        </div>
      )}

      {deleteFailed && (
        <div className="p-3 bg-accent border-2 border-ink text-ink font-mono text-xs motion-shake">
          [ERROR] {t('deleteEventFailed')}
        </div>
      )}

      {confirmingDelete && (
        <ConfirmModal
          title={t('deleteEventConfirmTitle', { title: event.title })}
          description={t('deleteEventConfirmDesc')}
          cancelLabel={t('confirmCancelBtn')}
          confirmLabel={isUpdating ? t('deleteEventDeleting') : t('deleteEventConfirmBtn')}
          isBusy={isUpdating}
          onCancel={closeDeleteConfirm}
          onConfirm={handleDeleteEvent}
        />
      )}

      {confirmingRotate && (
        <ConfirmModal
          title={t('rotateAdminConfirmTitle')}
          description={t('rotateAdminConfirmDesc')}
          cancelLabel={t('confirmCancelBtn')}
          confirmLabel={isUpdating ? t('rotateAdminRotating') : t('rotateAdminConfirmBtn')}
          isBusy={isUpdating}
          onCancel={closeRotateConfirm}
          onConfirm={handleRotateAdminLink}
        />
      )}
    </div>
  );
}
