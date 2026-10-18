'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  LanguageCode,
  SUPPORTED_LANGUAGES,
  translations,
  LanguageInfo,
} from './translations';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string, fallback?: string) => string;
  tb: (key: string, fallbackEn?: string) => string;
  languages: LanguageInfo[];
  currentLanguageInfo: LanguageInfo;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Default language is English as required
  const [language, setLanguageState] = useState<LanguageCode>('en');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('dharadrishti-lang') as LanguageCode;
      if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
        setLanguageState(saved);
      }
    } catch {
      // LocalStorage access safe fallback
    }
  }, []);

  const setLanguage = useCallback((lang: LanguageCode) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('dharadrishti-lang', lang);
    } catch {
      // safe fallback
    }
  }, []);

  // Standard single translation
  const t = useCallback(
    (key: string, fallback?: string): string => {
      const entry = translations[key];
      if (!entry) return fallback || key;
      return entry[language] || entry['en'] || fallback || key;
    },
    [language]
  );

  // Bilingual translation:
  // If language === 'en' -> returns English only
  // If language !== 'en' -> returns Native (English)
  const tb = useCallback(
    (key: string, fallbackEn?: string): string => {
      const entry = translations[key];
      const enVal = entry?.['en'] || fallbackEn || key;
      if (language === 'en') return enVal;
      const nativeVal = entry?.[language] || enVal;
      if (nativeVal === enVal) return enVal;
      return `${nativeVal} (${enVal})`;
    },
    [language]
  );

  const currentLanguageInfo =
    SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        tb,
        languages: SUPPORTED_LANGUAGES,
        currentLanguageInfo,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
