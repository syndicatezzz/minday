import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
type Size = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-fg text-bg shadow-[0_8px_24px_-10px_rgba(0,0,0,0.45)] hover:shadow-[0_12px_30px_-10px_var(--ring)] hover:bg-fg/90',
  secondary: 'glass text-fg hover:bg-fill-strong',
  ghost: 'text-muted hover:text-fg hover:bg-fill',
  subtle: 'bg-fill text-fg hover:bg-fill-strong border border-line',
  danger: 'bg-danger/12 text-danger border border-danger/25 hover:bg-danger/20',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[13px] gap-1.5 rounded-xl',
  md: 'h-11 px-5 text-sm gap-2 rounded-2xl',
  lg: 'h-12 px-6 text-[15px] gap-2 rounded-2xl',
  icon: 'h-11 w-11 rounded-2xl',
  'icon-sm': 'h-9 w-9 rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center font-medium tracking-[-0.01em] select-none',
        'transition-[transform,background-color,box-shadow,color,opacity] duration-200 ease-out',
        'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
});
