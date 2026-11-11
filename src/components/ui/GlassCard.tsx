'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { fadeUp } from '@/lib/motion';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  /** Включить плавное появление (используется внутри контейнера со stagger). */
  animated?: boolean;
  interactive?: boolean;
  ariaLabel?: string;
  id?: string;
}

export function GlassCard({ children, className, animated = true, interactive, ariaLabel, id }: GlassCardProps) {
  return (
    <motion.div
      id={id}
      role={ariaLabel ? 'region' : undefined}
      aria-label={ariaLabel}
      variants={animated ? fadeUp : undefined}
      className={cn(
        'glass glass-hover spotlight rounded-[26px]',
        interactive && 'lift',
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="flex min-w-0 items-center gap-2.5">
        {icon && <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-fill text-muted">{icon}</span>}
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-fg">{title}</h2>
          {subtitle && <p className="mt-0.5 truncate text-xs text-subtle">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
