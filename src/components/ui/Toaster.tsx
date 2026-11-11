'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { BellRing, CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { springSoft } from '@/lib/motion';
import { useStore } from '@/lib/store/create-store';
import { dismissToast, toastStore, type ToastItem } from '@/lib/store/toast-store';

const icons = {
  success: { Icon: CircleCheck, cls: 'text-success bg-success/12' },
  error: { Icon: CircleAlert, cls: 'text-danger bg-danger/12' },
  info: { Icon: Info, cls: 'text-accent bg-accent/12' },
  reminder: { Icon: BellRing, cls: 'text-accent bg-accent/12' },
};

function ToastCard({ t }: { t: ToastItem }) {
  const [paused, setPaused] = useState(false);
  const remaining = useRef(t.duration);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    if (paused) return;
    startedAt.current = Date.now();
    const id = window.setTimeout(() => dismissToast(t.id), remaining.current);
    return () => {
      window.clearTimeout(id);
      remaining.current -= Date.now() - startedAt.current;
    };
  }, [paused, t.id]);

  const { Icon, cls } = icons[t.tone];
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.96, transition: { duration: 0.2 } }}
      transition={springSoft}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="glass-solid pointer-events-auto flex w-full items-start gap-3 rounded-2xl p-3.5 pr-2"
      role={t.tone === 'error' ? 'alert' : 'status'}
    >
      <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', cls)}>
        <Icon size={17} />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-sm font-medium text-fg">{t.title}</p>
        {t.description && <p className="mt-0.5 text-[13px] leading-snug text-muted">{t.description}</p>}
      </div>
      {t.action && (
        <button
          type="button"
          onClick={() => {
            t.action?.onClick();
            dismissToast(t.id);
          }}
          className="mt-0.5 h-8 shrink-0 rounded-lg px-2.5 text-[13px] font-semibold text-accent transition-colors hover:bg-accent/10"
        >
          {t.action.label}
        </button>
      )}
      <button
        type="button"
        aria-label="Закрыть уведомление"
        onClick={() => dismissToast(t.id)}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-subtle transition-colors hover:bg-fill hover:text-fg"
      >
        <X size={15} />
      </button>
    </motion.li>
  );
}

export function Toaster() {
  const toasts = useStore(toastStore, (s) => s.toasts);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-[70] flex justify-center px-4 lg:inset-x-auto lg:right-6 lg:bottom-24 lg:px-0"
    >
      <ul className="flex w-full max-w-sm flex-col gap-2">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <ToastCard key={t.id} t={t} />
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
