import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  I18nContext,
  type I18nContextValue,
  type Language,
  type TranslationParams,
} from './useI18n';
import { bg } from './i18n/bg';
import { en } from './i18n/en';

const LANGUAGE_STORAGE_KEY = 'appLanguage';

const dictionaries: Record<Language, Record<string, string>> = {
  en,
  bg,
};

const localeMap: Record<Language, string> = {
  en: 'en-US',
  bg: 'bg-BG',
};

const getStoredLanguage = (): Language => {
  if (typeof window === 'undefined') return 'en';
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return stored === 'bg' ? 'bg' : 'en';
};

const interpolate = (value: string, params?: TranslationParams) => {
  if (!params) return value;
  return value.replace(/\{(\w+)\}/g, (_, key: string) => String(params[key] ?? `{${key}}`));
};

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(getStoredLanguage);
  const locale = localeMap[language];

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      locale,
      setLanguage,
      t: (key: string, params?: TranslationParams) => {
        const template = dictionaries[language][key] ?? dictionaries.en[key] ?? key;
        return interpolate(template, params);
      },
    }),
    [language, locale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
