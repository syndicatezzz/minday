'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Lightbulb, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { actions, useApp } from '@/lib/store/app-store';

/** Подсказка при первом использовании функции. Скрывается навсегда после закрытия. */
export function Hint({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  const dismissed = useApp((s) => s.data.meta.dismissedHints.includes(id));
  return (
    <AnimatePresence initial={false}>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden"
        >
          <div
            className={cn(
              'flex items-start gap-3 rounded-2xl border border-accent/20 bg-accent/[0.07] px-4 py-3 text-[13px] leading-relaxed text-muted',
              className,
            )}
          >
            <Lightbulb size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden />
            <div className="flex-1">{children}</div>
            <button
              type="button"
              onClick={() => actions.dismissHint(id)}
              aria-label="Скрыть подсказку"
              className="-mt-1 -mr-2 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-subtle transition-colors hover:bg-fill hover:text-fg"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
