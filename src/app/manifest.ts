import type { MetadataRoute } from 'next';
import { APP_CONFIG } from '@/config/app';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${APP_CONFIG.name} — трекер привычек`,
    short_name: APP_CONFIG.name,
    description: APP_CONFIG.tagline,
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0d',
    theme_color: '#0a0a0d',
    lang: 'ru',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
  };
}
