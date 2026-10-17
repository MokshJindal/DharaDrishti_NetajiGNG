'use client';

import React, { useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import Navbar, { PRIMARY_NAV_LINKS } from '@/components/layout/Navbar';
import VoiceButton from '@/components/layout/VoiceButton';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const pathname = usePathname();
  const { t } = useLanguage();

  const toggleMobileDrawer = useCallback(() => {
    setMobileDrawerOpen((prev) => !prev);
  }, []);

  const closeMobileDrawer = useCallback(() => {
    setMobileDrawerOpen(false);
  }, []);

  const isBottomNavActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-[#f8faf7] flex flex-col font-sans text-[#186049]">
      {/* 1. Subtle, Clean Modern Navbar */}
      <Navbar onMobileMenuToggle={toggleMobileDrawer} />

      {/* 2. Mobile Off-Canvas Drawer Menu */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={closeMobileDrawer}
          />

          <div className="relative flex w-4/5 max-w-xs flex-col bg-white p-5 text-[#186049] shadow-xl">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🌱</span>
                <div>
                  <h2 className="text-base font-bold text-[#186049]">DharaDrishti</h2>
                  <p className="text-[11px] text-[#B98327] font-medium">{t('appName', 'धरादृष्टि')}</p>
                </div>
              </div>
              <button
                onClick={closeMobileDrawer}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                aria-label="Close Menu"
              >
                ✕
              </button>
            </div>

            {/* Navigation Links */}
            <div className="mt-3 flex-1 overflow-y-auto space-y-1 py-2">
              {PRIMARY_NAV_LINKS.map((item) => {
                const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={closeMobileDrawer}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                      active
                        ? 'bg-[#186049] text-white shadow-xs'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span>{t(item.key, item.labelEn)}</span>
                  </Link>
                );
              })}

              <Link
                href="/settings"
                onClick={closeMobileDrawer}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  pathname === '/settings'
                    ? 'bg-[#186049] text-white shadow-xs'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-lg">⚙️</span>
                <span>{t('settings', 'Settings')}</span>
              </Link>
            </div>

            {/* Drawer Footer */}
            <div className="border-t border-gray-100 pt-3 text-center text-xs text-gray-500">
              <p className="font-semibold text-[#186049]">DharaDrishti Kisan Assistant</p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Full-Width Portal Body (Generous whitespace & max-width) */}
      <main className="flex-1 pb-20 md:pb-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6">
          {children}
        </div>
      </main>

      {/* 4. Global Voice Floating Trigger Button */}
      <VoiceButton />

      {/* 5. Mobile Bottom Sticky Navigation (Clean, minimal, subtle) */}
      <nav
        className="safe-bottom fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200/80 bg-white/95 backdrop-blur-md lg:hidden shadow-sm"
        aria-label="Mobile Navigation"
      >
        <div className="flex h-15 items-center justify-around px-2">
          {PRIMARY_NAV_LINKS.slice(0, 5).map((item) => {
            const active = isBottomNavActive(item.href);
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`relative flex flex-1 flex-col items-center justify-center py-1 transition-all ${
                  active ? 'text-[#186049] font-bold' : 'text-gray-500 font-medium'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                {active && (
                  <span className="absolute top-0 h-0.5 w-6 rounded-full bg-[#186049]" />
                )}
                <span className="text-lg" role="img" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="mt-0.5 text-[10px] leading-tight truncate max-w-[60px]">
                  {t(item.key, item.labelEn)}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* 6. Subtle, Clean Minimal Footer */}
      <footer className="hidden lg:block border-t border-gray-200/80 bg-white py-5 text-xs text-gray-500">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <span className="text-base">🌱</span>
            <span className="font-semibold text-[#186049]">
              DharaDrishti • {t('appName', 'धरादृष्टि')}
            </span>
            <span className="text-gray-300">|</span>
            <span>Simple, Voice-First Farm Management</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-gray-600">
            <Link href="/fields" className="hover:text-[#186049] transition">{t('myFields', 'Fields')}</Link>
            <Link href="/diagnose" className="hover:text-[#186049] transition">{t('diagnose', 'Disease')}</Link>
            <Link href="/irrigation" className="hover:text-[#186049] transition">{t('irrigation', 'Water')}</Link>
            <Link href="/profit" className="hover:text-[#186049] transition">{t('profit', 'Mandi')}</Link>
            <Link href="/settings" className="hover:text-[#186049] transition">{t('settings', 'Language')}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
