import type { Metadata, Viewport } from 'next';
import './globals.css';
import { LanguageProvider } from '@/lib/i18n/LanguageContext';
import { VoiceProvider } from '@/lib/voice/VoiceContext';
import AppShell from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'DharaDrishti – Simple & Voice-First Farm Assistant',
  description:
    'Calm, accessible, voice-first farm management assistant for Indian farmers. Land boundary mapping, leaf doctor, irrigation alerts, and mandi rates in 10 Indian languages.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'DharaDrishti',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#186049',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="hi">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Noto+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="antialiased bg-[#f8faf7] text-[#186049]">
        <LanguageProvider>
          <VoiceProvider>
            <AppShell>{children}</AppShell>
          </VoiceProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
