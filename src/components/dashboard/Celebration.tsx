'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { Portal } from '@/components/ui/Portal';
import { plural } from '@/lib/date';
import { EASE_OUT, springBouncy, springSoft } from '@/lib/motion';

const CONFETTI = Array.from({ length: 22 }, (_, i) => {
  const a = (i / 22) * Math.PI * 2;
  const dist = 120 + ((i * 37) % 70);
  return {
    x: Math.cos(a) * dist,
    y: Math.sin(a) * dist - 20,
    r: ((i * 53) % 180) - 90,
    w: i % 3 === 0 ? 10 : 6,
    h: i % 3 === 0 ? 4 : 6,
    c: ['var(--success)', 'var(--accent)', 'var(--accent-2)', 'var(--warning)'][i % 4],
    d: (i % 5) * 0.03,
  };
});

/** Анимация достижения: все привычки дня выполнены. Закрывается сама. */
export function Celebration({ open, onClose, count, streak }: { open: boolean; onClose: () => void; count: number; streak: number }) {
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(onClose, 3200);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[75] grid place-items-center p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
            onClick={onClose}
            role="status"
            aria-live="polite"
          >
            <div className="absolute inset-0 bg-bg/40 backdrop-blur-[3px]" aria-hidden />
            <motion.div
              className="glass-solid relative flex w-full max-w-xs flex-col items-center rounded-[32px] px-8 pt-10 pb-8 text-center"
              initial={{ scale: 0.86, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              transition={springSoft}
            >
              <div className="relative grid h-24 w-24 place-items-center">
                {CONFETTI.map((p, i) => (
                  <motion.span
                    key={i}
                    aria-hidden
                    className="absolute top-1/2 left-1/2 rounded-[2px]"
                    style={{ width: p.w, height: p.h, marginLeft: -p.w / 2, marginTop: -p.h / 2, background: p.c }}
                    initial={{ x: 0, y: 0, opacity: 0, rotate: 0, scale: 0.4 }}
                    animate={{ x: p.x, y: [0, p.y, p.y + 40], opacity: [0, 1, 0], rotate: p.r * 3, scale: 1 }}
                    transition={{ duration: 1.6, delay: 0.15 + p.d, ease: EASE_OUT }}
                  />
                ))}
                <motion.span
                  aria-hidden
                  className="absolute inset-0 rounded-full"
                  style={{ background: 'radial-gradient(circle, color-mix(in oklab, var(--success) 45%, transparent), transparent 70%)' }}
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: [0.4, 1.6, 1.3], opacity: [0, 0.9, 0.5] }}
                  transition={{ duration: 1.2, ease: EASE_OUT }}
                />
                <motion.span
                  className="relative grid h-20 w-20 place-items-center rounded-full"
                  style={{ background: 'linear-gradient(140deg, color-mix(in oklab, var(--success) 75%, white), var(--success))' }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ ...springBouncy, delay: 0.1 }}
                >
                  <svg width="38" height="38" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <motion.path
                      d="M5 12.5l4.5 4.5L19 7.5"
                      stroke="white"
                      strokeWidth={2.6}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.45, delay: 0.35, ease: 'easeOut' }}
                    />
                  </svg>
                </motion.span>
              </div>
              <motion.h2
                className="mt-6 text-2xl font-semibold tracking-[-0.03em] text-fg"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.5, ease: EASE_OUT }}
              >
                День закрыт
              </motion.h2>
              <motion.p
                className="mt-1.5 text-sm text-muted"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55, duration: 0.5, ease: EASE_OUT }}
              >
                {count} из {count} {plural(count, ['привычка', 'привычки', 'привычек'])} выполнено
                {streak > 1 ? ` · серия ${streak} ${plural(streak, ['день', 'дня', 'дней'])}` : ''}
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
