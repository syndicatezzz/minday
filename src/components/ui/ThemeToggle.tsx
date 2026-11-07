'use client';

import { motion } from 'framer-motion';
import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/cn';
import { springSnappy } from '@/lib/motion';
import { actions, useApp } from '@/lib/store/app-store';
import type { ThemePreference } from '@/types';

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Светлая тема', Icon: Sun },
  { value: 'dark', label: 'Тёмная тема', Icon: Moon },
  { value: 'system', label: 'Как в системе', Icon: Monitor },
];

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useApp((s) => s.data.settings.theme);
  return (
    <div role="radiogroup" aria-label="Тема оформления" className={cn('glass-subtle flex rounded-2xl p-1', className)}>
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => actions.updateSettings({ theme: value })}
            className={cn(
              'relative grid h-8 flex-1 place-items-center rounded-xl transition-colors duration-200',
              active ? 'text-fg' : 'text-subtle hover:text-muted',
            )}
          >
            {active && (
              <motion.span
                layoutId="theme-toggle-pill"
                className="absolute inset-0 rounded-xl bg-[var(--glass-top)] shadow-[0_1px_3px_rgba(0,0,0,0.15)] ring-1 ring-line"
                transition={springSnappy}
              />
            )}
            <motion.span
              key={`${value}-${active}`}
              className="relative z-10"
              initial={active ? { rotate: -40, scale: 0.6 } : false}
              animate={{ rotate: 0, scale: 1 }}
              transition={springSnappy}
            >
              <Icon size={15} />
            </motion.span>
          </button>
        );
      })}
    </div>
  );
}
