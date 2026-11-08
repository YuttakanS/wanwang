'use client';

import React, { useCallback, useState } from 'react';
import { WanWangEvent, Participant } from '@/types';
import { generateLineShareMessage } from '@/lib/timeUtils';
import { useRouter } from 'next/navigation';
import { buildAdminLink, forgetEvent, getStoredAdminKey } from '@/lib/adminAccess';
import ConfirmModal from '@/components/ConfirmModal';
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

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedAdminLink, setCopiedAdminLink] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [rotateFailed, setRotateFailed] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const closeDeleteConfirm = useCallback(() => setConfirmingDelete(false), []);
  const [confirmingRotate, setConfirmingRotate] = useState(false);
  const closeRotateConfirm = useCallback(() => setConfirmingRotate(false), []);
  const router = useRouter();

  const getEventUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/e/${event.slug}`;
    }
    return `https://wanwang.me/e/${event.slug}`;
  };

  const handleCopyLink = async () => {
    const url = getEventUrl();
    await navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopySummaryText = async () => {
    const url = getEventUrl();
    const text = generateLineShareMessage(event, participants, url, lang);
    await navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleShareToLine = () => {
    const url = getEventUrl();
    const message = generateLineShareMessage(event, participants, url, lang);

    if (navigator.share) {
      navigator.share({
        title: `วันว่าง: ${event.title}`,
        text: message,
        url: url,
      }).catch(() => {
        window.open(`https://line.me/R/msg/text/?${encodeURIComponent(message)}`, '_blank');
      });
    } else {
      window.open(`https://line.me/R/msg/text/?${encodeURIComponent(message)}`, '_blank');
    }
  };

  const handleCopyAdminLink = async () => {
    const adminKey = event.adminKey || getStoredAdminKey(event.slug);

    if (adminKey) {
      await navigator.clipboard.writeText(buildAdminLink(event.slug, adminKey));
      setCopiedAdminLink(true);
      setTimeout(() => setCopiedAdminLink(false), 2000);
    }
  };

  const handleRotateAdminLink = async () => {
    const adminKey = event.adminKey || getStoredAdminKey(event.slug);
    if (!adminKey) return;

    setIsUpdating(true);
    setRotateFailed(false);

    try {
      const res = await fetch(`/api/events/${event.slug}/admin-key`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey },
      });
      const data = await res.json();
      if (!res.ok || !data.adminKey) throw new Error(data.error || 'Rotate failed');
      onAdminKeyRotated(data.adminKey);
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
    <div className="bg-white border-3 border-black p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Share buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* LINE Share: Primary Button with Accent Yellow and Hard Shadow */}
          <button
            type="button"
            onClick={handleShareToLine}
            className="btn-primary-raw px-4 py-2 text-xs sm:text-sm font-bold"
          >
            {t('shareLineBtn')}
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

        {/* Organizer / Admin secret UX */}
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0 border-t-2 sm:border-t-0 border-black">
            <span className="font-mono text-xs font-bold px-2 py-1 bg-[#F0F0F0] border-2 border-black text-black">
              {t('adminVerifiedBadge')}
            </span>

            <button
              type="button"
              onClick={handleCopyAdminLink}
              className="px-2 py-1 bg-white hover:bg-black hover:text-white border-2 border-black font-mono text-xs transition-none"
            >
              {copiedAdminLink ? t('copyAdminLinkDone') : t('copyAdminLinkBtn')}
            </button>

            <button
              type="button"
              disabled={isUpdating}
              onClick={() => setConfirmingRotate(true)}
              className="px-2 py-1 bg-white hover:bg-black hover:text-white border-2 border-black font-mono text-xs transition-none"
            >
              {t('rotateAdminBtn')}
            </button>

            <button
              type="button"
              disabled={isUpdating}
              onClick={handleToggleClosed}
              className={`px-2.5 py-1 font-mono text-xs font-bold border-2 border-black transition-none ${
                event.isClosed
                  ? 'bg-[#FFE500] text-black hover:bg-black hover:text-[#FFE500]'
                  : 'bg-black text-white hover:bg-white hover:text-black'
              }`}
            >
              {event.isClosed ? t('reopenVotingBtn') : t('closeVotingBtn')}
            </button>

            <button
              type="button"
              disabled={isUpdating}
              onClick={() => setConfirmingDelete(true)}
              className="px-2.5 py-1 font-mono text-xs font-bold border-2 border-black bg-[#FF0000] text-white hover:bg-black hover:text-[#FF0000] transition-none"
            >
              {t('deleteEventBtn')}
            </button>
          </div>
        )}
      </div>

      {rotateFailed && (
        <div className="p-3 bg-[#FFE500] border-2 border-black text-black font-mono text-xs motion-shake">
          [ERROR] {t('rotateAdminFailed')}
        </div>
      )}

      {deleteFailed && (
        <div className="p-3 bg-[#FFE500] border-2 border-black text-black font-mono text-xs motion-shake">
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
