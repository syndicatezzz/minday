import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Chip({
  active,
  onClick,
  children,
  className,
  ariaLabel,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-3.5 text-[13px] font-medium transition-all duration-200 active:scale-[0.96]',
        active
          ? 'border-accent/40 bg-accent/15 text-fg shadow-[inset_0_1px_0_var(--glass-highlight)]'
          : 'border-line bg-fill text-muted hover:bg-fill-strong hover:text-fg',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = 'default',
  className,
}: {
  children: ReactNode;
  tone?: 'default' | 'success' | 'danger' | 'warning' | 'accent';
  className?: string;
}) {
  const cls = {
    default: 'bg-fill text-muted border-line',
    success: 'bg-success/12 text-success border-success/20',
    danger: 'bg-danger/12 text-danger border-danger/20',
    warning: 'bg-warning/12 text-warning border-warning/20',
    accent: 'bg-accent/12 text-accent border-accent/20',
  }[tone];
  return (
    <span className={cn('inline-flex h-6 items-center gap-1 rounded-lg border px-2 text-[11px] font-medium whitespace-nowrap', cls, className)}>
      {children}
    </span>
  );
}

export function Stepper({
  value,
  onChange,
  min = 1,
  max = 99,
  label,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label: string;
  suffix?: string;
}) {
  const btn =
    'grid h-10 w-10 place-items-center rounded-xl text-lg text-muted transition-colors hover:bg-fill-strong hover:text-fg disabled:opacity-30';
  return (
    <div className="glass-subtle inline-flex items-center gap-1 rounded-2xl p-1" role="group" aria-label={label}>
      <button type="button" className={btn} aria-label="Уменьшить" disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>
        −
      </button>
      <output aria-live="polite" className="min-w-[64px] text-center text-[15px] font-semibold text-fg tabular-nums">
        {value}
        {suffix && <span className="ml-1 text-xs font-normal text-subtle">{suffix}</span>}
      </output>
      <button type="button" className={btn} aria-label="Увеличить" disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>
        +
      </button>
    </div>
  );
}
