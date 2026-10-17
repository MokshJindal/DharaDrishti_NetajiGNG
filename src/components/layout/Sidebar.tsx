'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useVoice } from '@/lib/voice/VoiceContext';
import { SUPPORTED_LANGUAGES, LanguageCode } from '@/lib/i18n/translations';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  { key: 'dashboard', href: '/', icon: '🏠' },
  { key: 'myFields', href: '/fields', icon: '🗺️' },
  { key: 'diagnose', href: '/diagnose', icon: '🔬' },
  { key: 'irrigation', href: '/irrigation', icon: '💧' },
  { key: 'profit', href: '/profit', icon: '💰' },
  { key: 'weather', href: '/weather', icon: '⛅' },
  { key: 'fasalScore', href: '/score', icon: '📊' },
  { key: 'chatbot', href: '/chat', icon: '💬' },
  { key: 'settings', href: '/settings', icon: '⚙️' },
] as const;

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { t, language, setLanguage } = useLanguage();
  const { isListening, toggleListening } = useVoice();

  const isActive = useCallback(
    (href: string) => {
      if (href === '/') return pathname === '/';
      return pathname.startsWith(href);
    },
    [pathname]
  );

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#186049] transition-transform duration-300 ease-in-out md:translate-x-0 border-r border-[#ECE8AF]/20 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Navigation"
      >
        {/* Logo / App Name */}
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <span className="text-3xl" role="img" aria-label="wheat">
            🌾
          </span>
          <div>
            <h2 className="text-lg font-black tracking-tight text-white">
              {t('appName', 'DharaDrishti')}
            </h2>
            <p className="text-[11px] text-[#ECE8AF]">
              {t('tagline', 'Vision of the Earth')}
            </p>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-150 ${
                      active
                        ? 'bg-[#4A943E] text-white shadow-md font-bold'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <span className="text-lg" role="img" aria-hidden="true">
                      {item.icon}
                    </span>
                    <span>{t(item.key, item.key)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom section */}
        <div className="border-t border-white/10 px-4 py-4 space-y-3">
          {/* Voice command button */}
          <button
            onClick={toggleListening}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-bold transition-all duration-150 ${
              isListening
                ? 'bg-[#B98327] text-white animate-pulse'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <span>🎤</span>
            <span>
              {isListening
                ? t('voiceListening', 'Listening…')
                : t('voiceActivePrompt', 'Speak Command')}
            </span>
          </button>

          {/* 10-Language Selector */}
          <div>
            <label
              htmlFor="sidebar-lang-select"
              className="mb-1 block text-[10px] uppercase font-bold tracking-wider text-[#ECE8AF]"
            >
              🌐 Language (भाषा)
            </label>
            <select
              id="sidebar-lang-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value as LanguageCode)}
              className="w-full appearance-none rounded-xl border border-white/20 bg-white/15 px-3 py-2 text-xs font-bold text-white outline-none transition hover:bg-white/20"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option
                  key={lang.code}
                  value={lang.code}
                  className="bg-[#186049] text-white font-medium"
                >
                  {lang.flag} {lang.nativeName} ({lang.name})
                </option>
              ))}
            </select>
          </div>
        </div>
      </aside>
    </>
  );
}
