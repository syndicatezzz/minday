import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { AppProviders } from '@/components/providers/AppProviders';
import { APP_CONFIG } from '@/config/app';
import { APPEARANCE_KEY, THEME_KEY } from '@/lib/storage/adapter';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: `${APP_CONFIG.name} — трекер привычек`, template: `%s · ${APP_CONFIG.name}` },
  description: APP_CONFIG.tagline,
  applicationName: APP_CONFIG.name,
  appleWebApp: { capable: true, title: APP_CONFIG.name, statusBarStyle: 'black-translucent' },
  icons: { apple: '/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0a0a0d',
};

/** Применяет тему до первой отрисовки, чтобы не было мигания. Тёмная — по умолчанию. */
const themeScript = `(function(){try{var t=localStorage.getItem('${THEME_KEY}')||'dark';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var c=document.documentElement.classList;c.toggle('dark',d);c.toggle('light',!d);var a=JSON.parse(localStorage.getItem('${APPEARANCE_KEY}')||'{}');for(var k in a){document.documentElement.dataset[k]=a[k]}}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" className={`dark ${inter.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
