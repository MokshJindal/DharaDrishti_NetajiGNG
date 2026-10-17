import type { Metadata, Viewport } from 'next';
import './globals.css';
import { LanguageProvider } from '@/lib/i18n/LanguageContext';
import { VoiceProvider } from '@/lib/voice/VoiceContext';
import AppShell from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'DharaDrishti – Voice-First Smart Farm Assistant',
  description:
    'AI-powered voice-first farm management assistant for Indian farmers. Geo-fencing, crop disease doctor, irrigation schedule, live mandi profit, and Fasal Score in multiple regional languages.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
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
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="hi">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="font-sans antialiased bg-[#f9faf7] text-[#186049]">
        <LanguageProvider>
          <VoiceProvider>
            <AppShell>{children}</AppShell>
          </VoiceProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
