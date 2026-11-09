'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

import { Language, translations } from './translations';

export type { Language, Translations } from './translations';
export { translations } from './translations';

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

const STORAGE_KEY = 'wanwang_lang';

export function I18nProvider({ children }: { children: ReactNode }) {
  // Default language is 'th'
  const [lang, setLangState] = useState<Language>('th');

  // Load from localStorage on mount safely
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'th' || saved === 'en') {
        setLangState(saved);
        if (typeof document !== 'undefined') {
          document.documentElement.lang = saved;
        }
      } else {
        if (typeof document !== 'undefined') {
          document.documentElement.lang = 'th';
        }
      }
    } catch {
      // Ignore localStorage access errors
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
    } catch {
      // Ignore localStorage write error
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = newLang;
    }
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    const dict = translations[lang] || translations.th;
    let text = dict[key] || translations.th[key] || key;

    if (params) {
      Object.entries(params).forEach(([paramKey, paramVal]) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
      });
    }

    return text;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
