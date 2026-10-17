'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { SUPPORTED_LANGUAGES, LanguageCode } from '@/lib/i18n/translations';

interface TopBarProps {
  title: string;
  onMenuToggle: () => void;
}

export default function TopBar({ title, onMenuToggle }: TopBarProps) {
  const { t, language, setLanguage } = useLanguage();
  const [isOnline, setIsOnline] = useState(true);
  const [showLangMenu, setShowLangMenu] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  return (
    <header className="safe-top sticky top-0 z-40 md:hidden shadow-md">
      {/* Accent bar */}
      <div className="h-1 bg-[#ECE8AF]" />

      <div className="flex items-center justify-between bg-[#186049] px-4 py-3">
        {/* Hamburger */}
        <button
          onClick={onMenuToggle}
          aria-label={t('openMenu', 'Open menu')}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-white transition-colors hover:bg-white/10 active:scale-95"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Title */}
        <h1 className="text-sm font-extrabold text-white truncate max-w-[180px]">{title}</h1>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Online/Offline indicator */}
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/20 text-[10px] font-bold text-white"
          >
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                isOnline ? 'bg-green-400 animate-pulse' : 'bg-red-400'
              }`}
            />
            <span>{isOnline ? 'Live' : 'Offline'}</span>
          </div>

          {/* Language quick-switch button */}
          <div className="relative">
            <button
              onClick={() => setShowLangMenu((v) => !v)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/15 text-xs font-black text-white hover:bg-white/25 transition active:scale-95"
            >
              <span>{currentLang.flag}</span>
              <span>{currentLang.nativeName.slice(0, 3)}</span>
            </button>

            {showLangMenu && (
              <div className="absolute right-0 top-11 z-50 w-44 rounded-2xl bg-white p-2 shadow-2xl border border-gray-100 max-h-64 overflow-y-auto space-y-1">
                {SUPPORTED_LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      setLanguage(l.code as LanguageCode);
                      setShowLangMenu(false);
                    }}
                    className={`flex items-center justify-between w-full px-3 py-2 text-xs rounded-xl text-left font-bold transition ${
                      language === l.code
                        ? 'bg-[#186049] text-white'
                        : 'text-gray-800 hover:bg-gray-100'
                    }`}
                  >
                    <span>{l.flag} {l.nativeName}</span>
                    <span className="text-[10px] opacity-70">{l.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
