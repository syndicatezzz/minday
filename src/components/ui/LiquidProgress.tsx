'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { springSoft } from '@/lib/motion';

const WAVE = 'M0 10 Q 25 0 50 10 T 100 10 T 150 10 T 200 10 V 40 H 0 Z';

/**
 * «Жидкий» прогресс: уровень жидкости поднимается пружиной, поверхность
 * мягко колышется. Анимируются только transform — дёшево для GPU.
 */
export function LiquidProgress({
  value,
  size = 120,
  color = 'var(--accent)',
  children,
  label,
  className,
  shape = 'circle',
}: {
  value: number;
  size?: number;
  color?: string;
  children?: ReactNode;
  label: string;
  className?: string;
  shape?: 'circle' | 'rounded';
}) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      className={cn(
        'relative isolate shrink-0 overflow-hidden bg-fill shadow-[inset_0_0_0_1px_var(--hairline)]',
        shape === 'circle' ? 'rounded-full' : 'rounded-[22px]',
        className,
      )}
      style={{ width: size, height: size }}
    >
      <motion.div
        className="absolute inset-x-0 bottom-0 h-full"
        initial={{ y: '100%' }}
        animate={{ y: `${(1 - v) * 100}%` }}
        transition={springSoft}
        aria-hidden
      >
        {/* Две волны с разной скоростью дают ощущение глубины */}
        <svg className="liquid-wave slow absolute -top-[9px] left-0 h-[22px] w-[200%] opacity-50" viewBox="0 0 200 40" preserveAspectRatio="none">
          <path d={WAVE} fill={color} />
        </svg>
        <svg className="liquid-wave absolute -top-[6px] left-0 h-[18px] w-[200%]" viewBox="0 0 200 40" preserveAspectRatio="none">
          <path d={WAVE} fill={color} />
        </svg>
        <div className="absolute inset-x-0 top-[10px] bottom-0" style={{ background: `linear-gradient(180deg, ${color}, color-mix(in oklab, ${color} 70%, black))` }} />
      </motion.div>
      <div className="absolute inset-0 rounded-[inherit] bg-[radial-gradient(80%_60%_at_30%_15%,rgba(255,255,255,0.22),transparent_60%)]" aria-hidden />
      <div className="relative z-10 grid h-full w-full place-items-center text-center">{children}</div>
    </div>
  );
}
