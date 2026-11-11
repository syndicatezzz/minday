'use client';

import { useEffect, useState } from 'react';
import { createStore, useStore } from '@/lib/store/create-store';

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

const pwaStore = createStore<{ prompt: InstallEvent | null; installed: boolean; online: boolean }>({
  prompt: null,
  installed: false,
  online: true,
});

let initialized = false;

/** Регистрирует Service Worker (только в продакшене) и следит за установкой и сетью. */
export function initPwa() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
  pwaStore.set({ installed: standalone, online: navigator.onLine });
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    pwaStore.set({ prompt: e as InstallEvent });
  });
  window.addEventListener('appinstalled', () => pwaStore.set({ installed: true, prompt: null }));
  window.addEventListener('online', () => pwaStore.set({ online: true }));
  window.addEventListener('offline', () => pwaStore.set({ online: false }));
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* офлайн-режим просто не будет доступен */
      });
    });
  }
}

export async function installApp() {
  const p = pwaStore.get().prompt;
  if (!p) return;
  await p.prompt();
  const choice = await p.userChoice;
  pwaStore.set({ prompt: null, installed: choice.outcome === 'accepted' });
}

export function useInstallState(): 'installed' | 'available' | 'ios' | 'unavailable' {
  const s = useStore(pwaStore, (x) => x);
  const [ios, setIos] = useState(false);
  useEffect(() => setIos(/iPhone|iPad|iPod/.test(navigator.userAgent)), []);
  if (s.installed) return 'installed';
  if (s.prompt) return 'available';
  return ios ? 'ios' : 'unavailable';
}

export function useOnline(): boolean {
  return useStore(pwaStore, (x) => x.online);
}
