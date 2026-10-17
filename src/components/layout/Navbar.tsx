'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useVoice } from '@/lib/voice/VoiceContext';
import { SUPPORTED_LANGUAGES, LanguageCode } from '@/lib/i18n/translations';

export const PRIMARY_NAV_LINKS = [
  { key: 'dashboard', href: '/', icon: '🏠', labelHi: 'होम', labelEn: 'Home' },
  { key: 'myFields', href: '/fields', icon: '🗺️', labelHi: 'खेत', labelEn: 'My Field' },
  { key: 'diagnose', href: '/diagnose', icon: '🌿', labelHi: 'फसल डॉक्टर', labelEn: 'Crop Doctor' },
  { key: 'irrigation', href: '/irrigation', icon: '💧', labelHi: 'सिंचाई', labelEn: 'Irrigation' },
  { key: 'profit', href: '/profit', icon: '💰', labelHi: 'मंडी भाव', labelEn: 'Mandi Rates' },
  { key: 'chatbot', href: '/chat', icon: '💬', labelHi: 'कृषि मित्र', labelEn: 'AI Mitra' },
] as const;

export default function Navbar({ onMobileMenuToggle }: { onMobileMenuToggle?: () => void }) {
  const pathname = usePathname();
  const { t, language, setLanguage } = useLanguage();
  const { isListening, toggleListening } = useVoice();
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowLangMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const adjustFontSize = (size: 'sm' | 'md' | 'lg') => {
    setFontSize(size);
    const root = document.documentElement;
    if (size === 'lg') root.style.fontSize = '18px';
    else if (size === 'sm') root.style.fontSize = '14px';
    else root.style.fontSize = '16px';
  };

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#e6eae4] shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5 sm:px-6">
        
        {/* Brand Logo & Name */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#186049] text-white shadow-sm transition group-hover:scale-105">
            <span className="text-xl">🌱</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold tracking-tight text-[#186049]">
                DharaDrishti
              </span>
              <span className="text-sm font-semibold text-[#B98327]">
                {t('appName', 'धरादृष्टि')}
              </span>
            </div>
            <p className="text-[10px] font-medium text-gray-500 leading-none">
              {t('tagline', 'Farm Assistant')}
            </p>
          </div>
        </Link>

        {/* Center: Subtle Horizontal Navigation Links (Desktop) */}
        <nav className="hidden lg:flex items-center gap-1">
          {PRIMARY_NAV_LINKS.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.key}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                  active
                    ? 'bg-[#186049]/10 text-[#186049] font-bold shadow-xs'
                    : 'text-gray-600 hover:text-[#186049] hover:bg-gray-100/70'
                }`}
              >
                <span>{link.icon}</span>
                <span>{t(link.key, link.labelEn)}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Utility Bar: Text Size, Language Selector, Voice Button, Mobile Toggle */}
        <div className="flex items-center gap-2">
          
          {/* Subtle Font Size Selector */}
          <div className="hidden sm:flex items-center rounded-lg border border-gray-200 bg-gray-50/70 p-0.5 text-[11px] font-medium text-gray-600">
            <button
              onClick={() => adjustFontSize('sm')}
              className={`px-2 py-0.5 rounded transition ${fontSize === 'sm' ? 'bg-white text-[#186049] font-bold shadow-xs' : 'hover:text-gray-900'}`}
              title="Small text"
            >
              A-
            </button>
            <button
              onClick={() => adjustFontSize('md')}
              className={`px-2 py-0.5 rounded transition ${fontSize === 'md' ? 'bg-white text-[#186049] font-bold shadow-xs' : 'hover:text-gray-900'}`}
              title="Normal text"
            >
              A
            </button>
            <button
              onClick={() => adjustFontSize('lg')}
              className={`px-2 py-0.5 rounded transition ${fontSize === 'lg' ? 'bg-white text-[#186049] font-bold shadow-xs' : 'hover:text-gray-900'}`}
              title="Large text"
            >
              A+
            </button>
          </div>

          {/* Clean 10-Language Dropdown (No broken flag emojis) */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowLangMenu((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-[#186049]/20 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#186049] shadow-xs hover:border-[#186049]/40 hover:bg-[#186049]/5 transition"
              aria-label="Select Language"
              aria-expanded={showLangMenu}
            >
              <span className="flex h-4 w-4 items-center justify-center rounded bg-[#186049]/10 text-[10px] font-bold text-[#186049]">
                {currentLang.flag}
              </span>
              <span className="font-bold">{currentLang.nativeName}</span>
              <span className="text-[9px] text-gray-400">▼</span>
            </button>

            {showLangMenu && (
              <div className="absolute right-0 top-9 z-50 w-52 rounded-xl bg-white p-1.5 shadow-xl border border-gray-200 text-gray-800 animate-slide-up">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                  Select Language / भाषा चुनें
                </div>
                <div className="mt-1 max-h-64 overflow-y-auto space-y-0.5">
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        setLanguage(l.code as LanguageCode);
                        setShowLangMenu(false);
                      }}
                      className={`flex items-center justify-between w-full px-2.5 py-1.5 text-xs rounded-lg text-left transition ${
                        language === l.code
                          ? 'bg-[#186049] text-white font-bold'
                          : 'text-gray-700 hover:bg-gray-100 font-medium'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-1 rounded ${language === l.code ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
                          {l.flag}
                        </span>
                        <span>{l.nativeName}</span>
                      </span>
                      <span className="text-[10px] opacity-70">{l.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Subtle Voice Mic Button */}
          <button
            onClick={toggleListening}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition shadow-xs ${
              isListening
                ? 'bg-[#B98327] text-white animate-voice-pulse'
                : 'bg-[#186049] text-white hover:bg-[#0f3d2e]'
            }`}
          >
            <span>🎙️</span>
            <span className="hidden sm:inline">
              {isListening ? t('voiceListening', 'Listening…') : t('voiceActivePrompt', 'बोलें')}
            </span>
          </button>

          {/* Mobile Navigation Toggle */}
          <button
            onClick={onMobileMenuToggle}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-700 lg:hidden hover:bg-gray-100 transition"
            aria-label="Toggle navigation"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </svg>
          </button>
        </div>

      </div>
    </header>
  );
}
