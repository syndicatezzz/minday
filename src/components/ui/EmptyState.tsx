'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { fadeUp } from '@/lib/motion';

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact,
}: {
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="show"
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'px-4 py-8' : 'glass rounded-[28px] px-6 py-14',
        className,
      )}
    >
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-[22px] bg-accent/25 blur-2xl" aria-hidden />
        <div className="glass relative grid h-16 w-16 place-items-center rounded-[22px] text-accent">{icon}</div>
      </div>
      <h3 className="text-lg font-semibold tracking-[-0.02em] text-fg">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted text-balance">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  );
}
