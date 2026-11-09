import { type ReactNode, useEffect, useMemo, useState } from 'react';
import type { Language } from '@/lib/translations';
import { translate } from '~/constants/strings';
import { I18nContext } from '~/hooks/useI18n';
import { loadLanguage, saveLanguage } from '~/services/localStore';

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language | null>(null);

  useEffect(() => {
    let active = true;
    void loadLanguage().then(saved => {
      if (active) setLangState(saved);
    });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(() => {
    const current = lang ?? 'th';
    return {
      lang: current,
      setLang: (next: Language) => {
        setLangState(next);
        void saveLanguage(next);
      },
      t: (key: string, params?: Record<string, string | number>) => translate(current, key, params),
    };
  }, [lang]);

  // The splash screen stays up until the saved language is known, so the other one never flashes.
  if (lang === null) return null;

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
