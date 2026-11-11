'use client';

import { useEffect } from 'react';
import { prefersReducedMotion } from '@/lib/navigation';
import { APPEARANCE_KEY, THEME_KEY } from '@/lib/storage/adapter';
import { useApp } from '@/lib/store/app-store';

function toggleClasses(dark: boolean) {
  const root = document.documentElement;
  root.classList.toggle('dark', dark);
  root.classList.toggle('light', !dark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0a0a0d' : '#eceef3');
}

type DocWithVT = Document & { startViewTransition?: (cb: () => void) => unknown };

/**
 * Смена темы — мягкое перетекание старой темы в новую.
 * View Transitions делает снимки страницы и плавно меняет их прозрачность
 * на GPU, поэтому стеклянные слои не перерисовываются в каждом кадре.
 * Без поддержки API тема меняется мгновенно (без тяжёлых CSS-переходов).
 */
function apply(dark: boolean, animate: boolean) {
  const root = document.documentElement;
  if (root.classList.contains('dark') === dark && root.classList.contains('light') === !dark) return;
  const doc = document as DocWithVT;
  if (animate && doc.startViewTransition && !prefersReducedMotion()) {
    doc.startViewTransition(() => toggleClasses(dark));
    return;
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

/** Применяет пользовательское оформление через data-атрибуты на <html>. */
export function AppearanceSync() {
  const a = useApp((s) => s.data.settings.appearance);
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.accent = a.accent;
    root.dataset.blur = a.blur;
    root.dataset.surface = a.surface;
    root.dataset.density = a.density;
    root.dataset.motion = a.motion;
    try {
      localStorage.setItem(APPEARANCE_KEY, JSON.stringify({ accent: a.accent, blur: a.blur, surface: a.surface, density: a.density, motion: a.motion }));
    } catch {
      /* ignore */
    }
  }, [a.accent, a.blur, a.surface, a.density, a.motion]);
  return null;
}
