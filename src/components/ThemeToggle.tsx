'use client';

import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Theme, getActiveTheme, getStoredTheme, saveTheme } from '@/lib/theme';

export default function ThemeToggle() {
  const { t } = useI18n();
  // Unknown on the server, so the icon appears only after mounting.
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(getActiveTheme());

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      if (!getStoredTheme()) setTheme(getActiveTheme());
    };
    media.addEventListener('change', handleSystemChange);
    return () => media.removeEventListener('change', handleSystemChange);
  }, []);

  const toggle = () => {
    const next: Theme = getActiveTheme() === 'dark' ? 'light' : 'dark';
    saveTheme(next);
    setTheme(next);
  };

  const Icon = theme === 'dark' ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? t('themeToLight') : t('themeToDark')}
      className="inline-flex items-center justify-center w-9 h-9 shrink-0 border-3 border-ink bg-surface text-ink hover:bg-ink hover:text-surface transition-none"
    >
      {theme && <Icon aria-hidden="true" size={18} />}
    </button>
  );
}
