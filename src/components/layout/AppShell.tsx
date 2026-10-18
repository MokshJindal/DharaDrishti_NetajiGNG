'use client';

import React, { useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import Navbar, { NAV_LINKS } from '@/components/layout/Navbar';
import VoiceButton from '@/components/layout/VoiceButton';

const BOTTOM_NAV_ITEMS = [
  { key: 'dashboard', href: '/', icon: '🏠', labelHi: 'होम', labelEn: 'Home' },
  { key: 'myFields', href: '/fields', icon: '🗺️', labelHi: 'खेत', labelEn: 'Fields' },
  { key: 'diagnose', href: '/diagnose', icon: '🌿', labelHi: 'डॉक्टर', labelEn: 'Doctor' },
  { key: 'irrigation', href: '/irrigation', icon: '💧', labelHi: 'सिंचाई', labelEn: 'Water' },
  { key: 'profit', href: '/profit', icon: '💰', labelHi: 'मंडी', labelEn: 'Mandi' },
  { key: 'chatbot', href: '/chat', icon: '💬', labelHi: 'कृषि मित्र', labelEn: 'AI Mitra' },
] as const;

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const pathname = usePathname();
  const { t, language } = useLanguage();

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
    <div className="min-h-screen bg-[#f5f8f4] flex flex-col font-sans text-[#186049]">
      {/* 1. Header with Navbar */}
      <Navbar onMobileMenuToggle={toggleMobileDrawer} />

      {/* 2. Mobile Off-Canvas Drawer Menu */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={closeMobileDrawer}
          />

          {/* Drawer Content */}
          <div className="relative flex w-4/5 max-w-sm flex-col bg-[#186049] p-5 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/15 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="text-3xl">🌱</span>
                <div>
                  <h2 className="text-lg font-black tracking-tight text-white">DharaDrishti</h2>
                  <p className="text-xs text-[#ECE8AF]">धरादृष्टि • किसान सेवा</p>
                </div>
              </div>
              <button
                onClick={closeMobileDrawer}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20"
                aria-label="Close Menu"
              >
                ✕
              </button>
            </div>

            {/* Navigation Links */}
            <div className="mt-4 flex-1 overflow-y-auto space-y-1 py-2">
              {NAV_LINKS.map((item) => {
                const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={closeMobileDrawer}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-bold transition ${
                      active
                        ? 'bg-[#ECE8AF] text-[#186049] shadow-md'
                        : 'text-white/85 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span>
                      {language === 'en'
                        ? item.labelEn
                        : `${t(item.key, item.labelHi)} (${item.labelEn})`}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Body Container (max-w-7xl for wide, aligned layout) */}
      <main className="flex-1 pb-24 md:pb-12">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-5">
          {children}
        </div>
      </main>

      {/* 4. Global Voice Floating Trigger Button */}
      <VoiceButton />

      {/* 5. Mobile Bottom Sticky Navigation */}
      <nav
        className="safe-bottom fixed bottom-0 left-0 right-0 z-40 border-t border-[#186049]/20 bg-white/95 backdrop-blur-md md:hidden shadow-lg"
        aria-label="Mobile Navigation"
      >
        <div className="flex h-16 items-center justify-around px-1">
          {BOTTOM_NAV_ITEMS.map((item) => {
            const active = isBottomNavActive(item.href);
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`relative flex flex-1 flex-col items-center justify-center py-1 transition-all ${
                  active ? 'text-[#186049] font-black scale-105' : 'text-gray-500 font-medium'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                {active && (
                  <span className="absolute top-0 h-1 w-8 rounded-full bg-[#4A943E]" />
                )}
                <span className="text-xl" role="img" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="mt-0.5 text-[10px] leading-tight truncate max-w-[64px]">
                  {language === 'en' ? item.labelEn : t(item.key, item.labelHi)}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* 6. Classy Portal Footer */}
      <footer className="hidden md:block border-t border-gray-200 bg-white py-6 text-xs text-gray-600">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <span className="text-xl">🌱</span>
            <div>
              <p className="font-extrabold text-[#186049]">
                DharaDrishti • Smart Environmental & Agricultural GIS Platform
              </p>
              <p className="text-[11px] text-gray-500">
                Voice-First Sustainable Farming System
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6 font-semibold">
            <Link href="/fields" className="hover:text-[#186049]">Field GIS Map</Link>
            <Link href="/fertiliser" className="hover:text-[#186049]">Soil Health Card</Link>
            <Link href="/diagnose" className="hover:text-[#186049]">Crop Sentinel</Link>
            <Link href="/profit" className="hover:text-[#186049]">APMC Mandi Rates</Link>
            <Link href="/settings" className="hover:text-[#186049]">Languages (10)</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
