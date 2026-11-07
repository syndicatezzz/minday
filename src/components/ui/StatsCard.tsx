'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { fadeUp } from '@/lib/motion';

export function StatsCard({
  label,
  value,
  hint,
  icon,
  tone = 'default',
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: 'default' | 'success' | 'danger' | 'accent' | 'warning';
  className?: string;
}) {
  const toneCls = {
    default: 'text-muted bg-fill',
    success: 'text-success bg-success/12',
    danger: 'text-danger bg-danger/12',
    accent: 'text-accent bg-accent/12',
    warning: 'text-warning bg-warning/12',
  }[tone];
  return (
    <motion.div variants={fadeUp} className={cn('glass rounded-[22px] p-4 sm:p-5', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-medium tracking-wide text-subtle uppercase">{label}</p>
        {icon && <span className={cn('grid h-8 w-8 place-items-center rounded-xl', toneCls)}>{icon}</span>}
      </div>
      <div className="mt-3 text-[28px] leading-none font-semibold tracking-[-0.03em] text-fg tabular-nums sm:text-[32px]">{value}</div>
      {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
    </motion.div>
  );
}
