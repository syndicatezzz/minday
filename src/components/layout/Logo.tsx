import { APP_CONFIG } from '@/config/app';
import { cn } from '@/lib/cn';

export function LogoMark({ size = 34, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn('glass relative grid shrink-0 place-items-center rounded-[11px]', className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient id="logo-g" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--accent-2)" />
            <stop offset="1" stopColor="var(--accent)" />
          </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="8.5" stroke="var(--fill-strong)" strokeWidth="3" />
        <path d="M12 3.5a8.5 8.5 0 1 1-8.05 5.75" stroke="url(#logo-g)" strokeWidth="3" strokeLinecap="round" />
        <circle cx="12" cy="12" r="2.2" fill="var(--fg)" />
      </svg>
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="text-[15px] font-semibold tracking-[0.18em] text-fg">{APP_CONFIG.name}</span>
    </span>
  );
}
