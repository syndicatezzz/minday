'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { springSnappy } from '@/lib/motion';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  /** Скрыть подпись визуально (она останется для скринридеров). */
  hideLabel?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md';
  id?: string;
}

export function Switch({ checked, onChange, label, hideLabel = true, disabled, size = 'md', id }: SwitchProps) {
  const dims = size === 'sm' ? 'h-6 w-10' : 'h-7 w-12';
  const knob = size === 'sm' ? 'h-5 w-5' : 'h-6 w-6';
  const travel = size === 'sm' ? 16 : 20;
  return (
    <label className={cn('inline-flex items-center gap-3', disabled ? 'opacity-50' : 'cursor-pointer')}>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={hideLabel ? label : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative shrink-0 rounded-full border p-[1px] transition-colors duration-300',
          dims,
          checked ? 'border-accent/40 bg-accent' : 'border-line bg-fill-strong',
        )}
      >
        <motion.span
          className={cn('block rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.25)]', knob)}
          animate={{ x: checked ? travel : 0 }}
          transition={springSnappy}
        />
      </button>
      {!hideLabel && <span className="text-sm text-fg">{label}</span>}
    </label>
  );
}
