'use client';

import { motion } from 'framer-motion';
import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { springSnappy } from '@/lib/motion';

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: ReactNode; icon?: ReactNode }[];
  ariaLabel: string;
  className?: string;
  size?: 'sm' | 'md';
  stretch?: boolean;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
  size = 'md',
  stretch,
}: SegmentedProps<T>) {
  const layoutId = useId();
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn('glass-subtle inline-flex rounded-2xl p-1', stretch && 'flex w-full', className)}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative flex items-center justify-center gap-1.5 rounded-xl font-medium transition-colors duration-200',
              size === 'sm' ? 'h-8 px-3 text-xs' : 'h-9 px-3.5 text-[13px]',
              stretch && 'flex-1',
              active ? 'text-fg' : 'text-subtle hover:text-muted',
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${layoutId}`}
                className="absolute inset-0 rounded-xl bg-[var(--glass-top)] shadow-[0_1px_3px_rgba(0,0,0,0.12),inset_0_1px_0_var(--glass-highlight)] ring-1 ring-line"
                transition={springSnappy}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5 whitespace-nowrap">
              {o.icon}
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
