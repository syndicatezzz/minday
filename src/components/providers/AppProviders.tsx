'use client';

import { MotionConfig } from 'framer-motion';
import { useEffect, type ReactNode } from 'react';
import { initAppStore } from '@/lib/store/app-store';
import { startClock } from '@/lib/store/clock';
import { ReminderRunner } from './ReminderRunner';
import { ThemeSync } from './ThemeSync';

export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    void initAppStore();
    return startClock();
  }, []);

  // Световое пятно на карточках следует за курсором (одно делегированное событие)
  useEffect(() => {
    if (!window.matchMedia('(hover: hover)').matches) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const el = (e.target as Element | null)?.closest?.('.spotlight') as HTMLElement | null;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - r.left}px`);
        el.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    };
    document.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      document.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <ThemeSync />
      <ReminderRunner />
      {children}
    </MotionConfig>
  );
}
