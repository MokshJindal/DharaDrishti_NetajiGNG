'use client';

import { useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import VoiceButton from '@/components/layout/VoiceButton';

const BOTTOM_NAV_ITEMS = [
  { key: 'dashboard', href: '/', icon: '🏠' },
  { key: 'myFields', href: '/fields', icon: '🗺️' },
  { key: 'diagnose', href: '/diagnose', icon: '🔬' },
  { key: 'weather', href: '/weather', icon: '⛅' },
  { key: 'fasalScore', href: '/score', icon: '📊' },
] as const;

const PAGE_TITLES: Record<string, string> = {
  '/': 'dashboard',
  '/fields': 'myFields',
  '/diagnose': 'diagnose',
  '/irrigation': 'irrigation',
  '/fertiliser': 'irrigation',
  '/profit': 'profit',
  '/weather': 'weather',
  '/score': 'fasalScore',
  '/chat': 'chatbot',
  '/settings': 'settings',
};

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { t } = useLanguage();

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const pageTitleKey =
    PAGE_TITLES[pathname] ||
    PAGE_TITLES[
      Object.keys(PAGE_TITLES).find(
        (key) => key !== '/' && pathname.startsWith(key)
      ) || '/'
    ] ||
    'dashboard';

  const pageTitle = t(pageTitleKey, 'DharaDrishti');

  const isBottomNavActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-[#f8faf7]">
      {/* Desktop sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      {/* Mobile top bar */}
      <TopBar title={pageTitle} onMenuToggle={toggleSidebar} />

      {/* Main content */}
      <main className="min-h-screen pb-24 transition-all duration-300 md:pb-6 md:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-5 md:px-8 md:py-6">
          {children}
        </div>
      </main>

      {/* Floating Global Voice Button */}
      <VoiceButton />

      {/* Mobile bottom navigation */}
      <nav
        className="safe-bottom fixed bottom-0 left-0 right-0 z-40 border-t border-[#186049]/15 bg-white/95 backdrop-blur-md md:hidden shadow-lg"
        aria-label="Mobile Navigation"
      >
        <div className="flex h-16 items-center justify-around px-2">
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
                  {t(item.key, item.key)}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
