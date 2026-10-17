'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useVoice } from '@/lib/voice/VoiceContext';
import { SUPPORTED_LANGUAGES, LanguageCode } from '@/lib/i18n/translations';

export const NAV_LINKS = [
  { key: 'dashboard', href: '/', icon: '🏠', labelHi: 'होम', labelEn: 'Home' },
  { key: 'myFields', href: '/fields', icon: '🗺️', labelHi: 'खेत मानचित्र', labelEn: 'Field Map' },
  { key: 'fertiliser', href: '/fertiliser', icon: '🧪', labelHi: 'मृदा व खाद', labelEn: 'Soil & NPK' },
  { key: 'diagnose', href: '/diagnose', icon: '🌿', labelHi: 'फसल डॉक्टर', labelEn: 'Crop Doctor' },
  { key: 'irrigation', href: '/irrigation', icon: '💧', labelHi: 'स्मार्ट सिंचाई', labelEn: 'Irrigation' },
  { key: 'profit', href: '/profit', icon: '💰', labelHi: 'मंडी भाव व लाभ', labelEn: 'Mandi Profit' },
  { key: 'weather', href: '/weather', icon: '⛅', labelHi: 'मौसम', labelEn: 'Weather' },
  { key: 'fasalScore', href: '/score', icon: '📊', labelHi: 'फसल स्कोर', labelEn: 'Fasal Score' },
  { key: 'chatbot', href: '/chat', icon: '💬', labelHi: 'कृषि मित्र', labelEn: 'Krishi AI' },
] as const;

export default function Navbar({ onMobileMenuToggle }: { onMobileMenuToggle?: () => void }) {
  const pathname = usePathname();
  const { t, language, setLanguage } = useLanguage();
  const { isListening, toggleListening } = useVoice();
  const [isOnline, setIsOnline] = useState(true);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [fontSizeLevel, setFontSizeLevel] = useState<'normal' | 'large' | 'small'>('normal');

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

  const adjustFontSize = (level: 'small' | 'normal' | 'large') => {
    setFontSizeLevel(level);
    const root = document.documentElement;
    if (level === 'large') root.style.fontSize = '18px';
    else if (level === 'small') root.style.fontSize = '14px';
    else root.style.fontSize = '16px';
  };

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 shadow-md">
      {/* 1. Indian National Government Tricolor Header Bar */}
      <div className="flex h-1.5 w-full">
        <div className="h-full flex-1 bg-[#FF9933]" title="Saffron" />
        <div className="h-full flex-1 bg-white" title="White" />
        <div className="h-full flex-1 bg-[#138808]" title="Green" />
      </div>

      {/* 2. Official Portal Utility Bar */}
      <div className="border-b border-gray-200 bg-[#0f3d2e] px-4 py-1.5 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between text-[11px] sm:text-xs">
          {/* Government Affiliation */}
          <div className="flex items-center gap-2">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px]">
              🏛️
            </span>
            <span className="font-semibold tracking-wide text-white/90">
              भारत सरकार | Government of India
            </span>
            <span className="hidden md:inline text-white/50">•</span>
            <span className="hidden md:inline text-white/80">
              कृषि एवं किसान कल्याण मंत्रालय | Ministry of Agriculture
            </span>
          </div>

          {/* Right Controls: Accessibility + Languages + Live status */}
          <div className="flex items-center gap-3">
            {/* Live Indicator */}
            <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  isOnline ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                }`}
              />
              <span className="hidden sm:inline">{isOnline ? 'Live Sentinel' : 'Offline Mode'}</span>
            </div>

            {/* Font Size Adjusters */}
            <div className="hidden sm:flex items-center gap-1 rounded bg-white/15 px-1 py-0.5 text-[10px] font-bold">
              <button
                onClick={() => adjustFontSize('small')}
                className={`px-1.5 py-0.5 rounded transition ${fontSizeLevel === 'small' ? 'bg-white text-[#186049]' : 'hover:bg-white/20'}`}
                title="Decrease font size"
              >
                A-
              </button>
              <button
                onClick={() => adjustFontSize('normal')}
                className={`px-1.5 py-0.5 rounded transition ${fontSizeLevel === 'normal' ? 'bg-white text-[#186049]' : 'hover:bg-white/20'}`}
                title="Normal font size"
              >
                A
              </button>
              <button
                onClick={() => adjustFontSize('large')}
                className={`px-1.5 py-0.5 rounded transition ${fontSizeLevel === 'large' ? 'bg-white text-[#186049]' : 'hover:bg-white/20'}`}
                title="Increase font size"
              >
                A+
              </button>
            </div>

            {/* Language Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowLangMenu((v) => !v)}
                className="flex items-center gap-1.5 rounded-md bg-[#ECE8AF] px-2.5 py-0.5 text-xs font-extrabold text-[#186049] shadow-sm hover:bg-white transition active:scale-95"
                aria-expanded={showLangMenu}
              >
                <span>{currentLang.flag}</span>
                <span>{currentLang.nativeName}</span>
                <span className="text-[10px]">▼</span>
              </button>

              {showLangMenu && (
                <div className="absolute right-0 top-7 z-50 w-52 rounded-xl bg-white p-2 shadow-2xl border border-gray-200 text-gray-800 max-h-72 overflow-y-auto">
                  <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-gray-500 border-b border-gray-100 mb-1">
                    Select Language / भाषा चुनें
                  </div>
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        setLanguage(l.code as LanguageCode);
                        setShowLangMenu(false);
                      }}
                      className={`flex items-center justify-between w-full px-2.5 py-1.5 text-xs rounded-lg text-left font-bold transition ${
                        language === l.code
                          ? 'bg-[#186049] text-white'
                          : 'text-gray-800 hover:bg-[#f5f8f4]'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span>{l.flag}</span>
                        <span>{l.nativeName}</span>
                      </span>
                      <span className="text-[10px] opacity-70">{l.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Classy Brand & Action Banner */}
      <div className="border-b border-[#186049]/15 bg-white px-4 py-2.5 sm:py-3.5">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          {/* Brand Logo & Title */}
          <Link href="/" className="group flex items-center gap-3">
            <div className="relative flex h-11 w-11 sm:h-13 sm:w-13 items-center justify-center rounded-2xl bg-gradient-to-br from-[#186049] to-[#4A943E] text-white shadow-md border-2 border-[#ECE8AF] transition group-hover:scale-105">
              <span className="text-2xl sm:text-3xl" role="img" aria-label="sprout">
                🌱
              </span>
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#B98327] text-[9px] text-white">
                ✓
              </span>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-[#186049]">
                  DharaDrishti
                </span>
                <span className="text-lg sm:text-xl font-extrabold text-[#B98327]">
                  धरादृष्टि
                </span>
              </div>
              <p className="hidden xs:block text-[10px] sm:text-[11px] font-semibold text-gray-600 tracking-wide">
                VOICE-FIRST SMART AGRI-GIS & SATELLITE PLATFORM
              </p>
            </div>
          </Link>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Toll Free Kisan Helpline */}
            <div className="hidden lg:flex flex-col text-right pr-2 border-r border-gray-200">
              <span className="text-[10px] text-gray-500 font-semibold">Kisan Call Center (24x7)</span>
              <span className="text-xs font-black text-[#186049]">📞 1800-180-1551</span>
            </div>

            {/* Voice Command Quick Button */}
            <button
              onClick={toggleListening}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black shadow-sm transition active:scale-95 ${
                isListening
                  ? 'bg-[#B98327] text-white animate-pulse'
                  : 'bg-[#ECE8AF] text-[#186049] hover:bg-[#dfd88f]'
              }`}
            >
              <span className="text-base sm:text-lg">🎙️</span>
              <span className="hidden sm:inline">
                {isListening ? t('voiceListening', 'Listening…') : 'बोलकर पूछें'}
              </span>
            </button>

            {/* Explore Map CTA */}
            <Link
              href="/fields"
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-[#4A943E] text-white text-xs sm:text-sm font-extrabold shadow hover:bg-[#37732d] transition active:scale-95"
            >
              <span>🗺️</span>
              <span className="hidden xs:inline">खेत का नक्शा</span>
              <span className="xs:hidden">नक्शा</span>
            </Link>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={onMobileMenuToggle}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-[#186049] md:hidden hover:bg-gray-200 transition"
              aria-label="Open Navigation Menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Classy Horizontal Main Navigation Bar (Desktop / Tablet) */}
      <nav className="hidden md:block bg-[#186049] px-4 shadow-inner border-t border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <ul className="flex items-center gap-1 py-1.5 overflow-x-auto scrollbar-none">
            {NAV_LINKS.map((link) => {
              const active = isActive(link.href);
              return (
                <li key={link.key}>
                  <Link
                    href={link.href}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold transition-all duration-150 whitespace-nowrap ${
                      active
                        ? 'bg-[#ECE8AF] text-[#186049] shadow-md scale-[1.02]'
                        : 'text-white/90 hover:bg-white/15 hover:text-white'
                    }`}
                  >
                    <span className="text-sm">{link.icon}</span>
                    <span>{language === 'hi' ? link.labelHi : link.labelEn}</span>
                    {active && <span className="h-1.5 w-1.5 rounded-full bg-[#186049]" />}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Quick Direct Link to Settings */}
          <Link
            href="/settings"
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              isActive('/settings')
                ? 'bg-[#ECE8AF] text-[#186049]'
                : 'text-white/80 hover:bg-white/15 hover:text-white'
            }`}
          >
            <span>⚙️</span>
            <span>{t('settings', 'Settings')}</span>
          </Link>
        </div>
      </nav>
    </header>
  );
}
