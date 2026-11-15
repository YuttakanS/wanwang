'use client';

import React, { useId, useState } from 'react';
import { Check } from 'lucide-react';
import { SIGN_DEFAULT_COLOR, SIGN_LIMITS, WanWangEvent } from '@/types';
import { getStoredAdminKey } from '@/lib/adminAccess';
import { useI18n } from '@/lib/i18n';
import LedSign from '@/components/LedSign';

interface LedSignEditorProps {
  event: WanWangEvent;
  onSaved: () => void;
  onCancel: () => void;
}

// The class names are written out in full so Tailwind finds them.
const PRESETS = [
  { color: '#ff3b30', labelKey: 'ledColorRed', swatch: 'bg-[#ff3b30]' },
  { color: '#ff9500', labelKey: 'ledColorAmber', swatch: 'bg-[#ff9500]' },
  { color: '#ffe500', labelKey: 'ledColorYellow', swatch: 'bg-[#ffe500]' },
  { color: '#39ff14', labelKey: 'ledColorGreen', swatch: 'bg-[#39ff14]' },
  { color: '#00e5ff', labelKey: 'ledColorCyan', swatch: 'bg-[#00e5ff]' },
  { color: '#4d7cff', labelKey: 'ledColorBlue', swatch: 'bg-[#4d7cff]' },
  { color: '#ff4fd8', labelKey: 'ledColorPink', swatch: 'bg-[#ff4fd8]' },
  { color: '#ffffff', labelKey: 'ledColorWhite', swatch: 'bg-[#ffffff]' },
] as const;

export default function LedSignEditor({ event, onSaved, onCancel }: LedSignEditorProps) {
  const { t } = useI18n();
  const idBase = useId();

  const [text, setText] = useState(event.sign?.text ?? '');
  const [color, setColor] = useState(event.sign?.color ?? SIGN_DEFAULT_COLOR);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const save = async (sign: { text: string; color: string } | null) => {
    setErrorMsg('');
    const unchanged = sign
      ? sign.text === event.sign?.text && sign.color === event.sign?.color
      : !event.sign;
    if (unchanged) {
      onCancel();
      return;
    }

    const adminKey = event.adminKey || getStoredAdminKey(event.slug);
    if (!adminKey) {
      setErrorMsg(t('editEventFailed'));
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/events/${event.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ sign }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t('editEventFailed'));
      onSaved();
    } catch (err) {
      setErrorMsg((err as Error)?.message || t('editEventFailed'));
      setIsSaving(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    // Saving an empty message takes the sign down.
    save(trimmed ? { text: trimmed, color } : null);
  };

  return (
    <form
      onSubmit={handleSubmit}
      aria-labelledby={`${idBase}-title`}
      className="w-full p-4 bg-surface border-3 border-ink space-y-4 motion-enter"
    >
      <div>
        <h2 id={`${idBase}-title`} className="text-lg font-bold text-ink">
          {t('ledSignTitle')}
        </h2>
        <p className="text-xs text-muted">{t('ledSignHelp')}</p>
      </div>

      <LedSign text={text.trim() || t('ledSignPreviewSample')} color={color} preview />

      <div>
        <label htmlFor={`${idBase}-text`} className="block text-sm font-bold text-ink mb-1">
          {t('ledSignTextLabel')}
        </label>
        <input
          id={`${idBase}-text`}
          type="text"
          maxLength={SIGN_LIMITS.text}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={t('ledSignTextPlaceholder')}
          className="block w-full min-w-0 px-3 py-2 bg-sunken hover:bg-sunken-hover border-3 border-ink text-ink text-sm focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink transition-none"
        />
        <p className="font-mono text-xs text-muted mt-1">
          {text.length}/{SIGN_LIMITS.text}
        </p>
      </div>

      <div>
        <span id={`${idBase}-color`} className="block text-sm font-bold text-ink mb-1.5">
          {t('ledSignColorLabel')}
        </span>
        <div role="group" aria-labelledby={`${idBase}-color`} className="flex flex-wrap items-center gap-2">
          {PRESETS.map(preset => (
            <button
              key={preset.color}
              type="button"
              aria-pressed={color === preset.color}
              aria-label={t(preset.labelKey)}
              title={t(preset.labelKey)}
              onClick={() => setColor(preset.color)}
              className={`w-9 h-9 flex items-center justify-center border-3 border-ink text-black ${preset.swatch}`}
            >
              {color === preset.color && <Check aria-hidden="true" size={18} strokeWidth={3} />}
            </button>
          ))}
          <label className="flex items-center gap-2 text-xs font-bold text-ink">
            <input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value.toLowerCase())}
              className="w-9 h-9 p-0 bg-surface border-3 border-ink cursor-pointer"
            />
            {t('ledSignCustomColor')}
          </label>
        </div>
      </div>

      {errorMsg && (
        <p role="alert" className="p-3 bg-accent border-2 border-ink text-ink font-mono text-xs motion-shake">
          [ERROR] {errorMsg}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={isSaving} className="btn-primary-raw px-4 py-2 text-sm font-bold">
          {isSaving ? t('savingChangesBtn') : t('saveChangesBtn')}
        </button>
        {event.sign && (
          <button
            type="button"
            disabled={isSaving}
            onClick={() => save(null)}
            className="btn-secondary-raw px-4 py-2 text-sm font-semibold"
          >
            {t('ledSignRemoveBtn')}
          </button>
        )}
        <button type="button" disabled={isSaving} onClick={onCancel} className="btn-secondary-raw px-4 py-2 text-sm font-semibold">
          {t('confirmCancelBtn')}
        </button>
      </div>
    </form>
  );
}
