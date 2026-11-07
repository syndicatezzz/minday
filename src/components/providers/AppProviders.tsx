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

  return (
    <MotionConfig reducedMotion="user">
      <ThemeSync />
      <ReminderRunner />
      {children}
    </MotionConfig>
  );
}
