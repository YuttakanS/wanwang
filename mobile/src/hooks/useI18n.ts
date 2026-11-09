import { createContext, useContext } from 'react';
import type { Language } from '@/lib/translations';
import type { Translate } from '~/constants/strings';

export interface I18nContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: Translate;
}

export const I18nContext = createContext<I18nContextValue | null>(null);

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}
