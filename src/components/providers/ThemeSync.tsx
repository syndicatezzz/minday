'use client';

import { useEffect } from 'react';
import { prefersReducedMotion } from '@/lib/navigation';
import { THEME_KEY } from '@/lib/storage/adapter';
import { takeThemeOrigin } from '@/lib/theme-origin';
import { useApp } from '@/lib/store/app-store';

function toggleClasses(dark: boolean) {
  const root = document.documentElement;
  root.classList.toggle('dark', dark);
  root.classList.toggle('light', !dark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0a0a0d' : '#eceef3');
}

type DocWithVT = Document & { startViewTransition?: (cb: () => void) => unknown };

function apply(dark: boolean, animate: boolean) {
  const root = document.documentElement;
  if (root.classList.contains('dark') === dark && root.classList.contains('light') === !dark) return;
  const doc = document as DocWithVT;
  const origin = takeThemeOrigin();
  if (animate && origin && doc.startViewTransition && !prefersReducedMotion()) {
    // Круговое раскрытие новой темы из точки нажатия
    const r = Math.hypot(Math.max(origin.x, innerWidth - origin.x), Math.max(origin.y, innerHeight - origin.y));
    root.style.setProperty('--vt-x', `${origin.x}px`);
    root.style.setProperty('--vt-y', `${origin.y}px`);
    root.style.setProperty('--vt-r', `${r}px`);
    doc.startViewTransition(() => toggleClasses(dark));
    return;
  }
  if (animate) {
    root.classList.add('theme-anim');
    window.setTimeout(() => root.classList.remove('theme-anim'), 450);
  }
  toggleClasses(dark);
}

/** Применяет выбранную тему и следит за системной, если выбрано «Как в системе». */
export function ThemeSync() {
  const theme = useApp((s) => s.data.settings.theme);
  const status = useApp((s) => s.status);

  useEffect(() => {
    if (status !== 'ready') return;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const update = (animate: boolean) => apply(theme === 'dark' || (theme === 'system' && mq.matches), animate);
    update(true);
    if (theme !== 'system') return;
    const onChange = () => update(true);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme, status]);

  return null;
}
