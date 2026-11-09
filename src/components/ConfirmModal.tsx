'use client';

import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmModalProps {
  title: string;
  description: string;
  cancelLabel: string;
  confirmLabel: string;
  isBusy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Mount only while open. Rendered in a portal so no ancestor can clip or offset it. */
export default function ConfirmModal({
  title,
  description,
  cancelLabel,
  confirmLabel,
  isBusy = false,
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  const id = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const pressStartedOnOverlay = useRef(false);

  // Focus starts on Cancel so a stray Enter cannot confirm a destructive action.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow, paddingRight } = document.body.style;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    cancelRef.current?.focus();

    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      previouslyFocused?.focus?.();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!isBusy) onCancel();
        return;
      }
      if (e.key !== 'Tab') return;

      // Keep keyboard focus inside the dialog.
      const buttons = Array.from(
        dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []
      );
      if (buttons.length === 0) {
        e.preventDefault();
        return;
      }
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !dialogRef.current?.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !dialogRef.current?.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isBusy, onCancel]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm motion-fade"
      onMouseDown={e => {
        pressStartedOnOverlay.current = e.target === e.currentTarget;
      }}
      onClick={e => {
        // Both press and release must be outside, so dragging out of the box won't close it.
        if (e.target === e.currentTarget && pressStartedOnOverlay.current && !isBusy) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        aria-busy={isBusy}
        className="w-full max-w-md max-h-full overflow-y-auto bg-surface border-5 border-ink shadow-[8px_8px_0_rgb(var(--shadow-color))] p-5 sm:p-6 space-y-5 motion-pop"
      >
        <div className="space-y-2">
          <h2 id={`${id}-title`} className="text-xl sm:text-2xl font-bold text-ink leading-tight break-words">
            {title}
          </h2>
          <p id={`${id}-description`} className="text-sm text-ink">
            {description}
          </p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 border-t-3 border-ink pt-4">
          <button
            ref={cancelRef}
            type="button"
            disabled={isBusy}
            onClick={onCancel}
            className="btn-secondary-raw px-4 py-2.5 text-sm cursor-pointer disabled:bg-sunken disabled:text-faint disabled:border-line-soft disabled:cursor-not-allowed"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={onConfirm}
            className="px-4 py-2.5 text-sm font-bold bg-[#D00000] text-white border-3 border-black hover:bg-black hover:text-[#FF0000] cursor-pointer transition-none disabled:bg-sunken disabled:text-faint disabled:border-line-soft disabled:cursor-not-allowed"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
