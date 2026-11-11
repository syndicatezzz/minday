'use client';

import { motion } from 'framer-motion';
import { AppLink } from '@/components/layout/AppLink';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { springSnappy } from '@/lib/motion';
import { NAV_ITEMS, isActivePath } from '@/lib/nav';

export function NavList({ layoutKey, onNavigate }: { layoutKey: string; onNavigate?: () => void }) {
  const pathname = usePathname() ?? '/';
  return (
    <nav aria-label="Основная навигация">
      <ul className="space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <li key={href}>
              <AppLink
                href={href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group relative flex h-11 items-center gap-3 rounded-2xl px-3.5 text-[14px] font-medium transition-colors duration-200',
                  active ? 'text-fg' : 'text-muted hover:text-fg',
                )}
              >
                {active && (
                  <motion.span
                    layoutId={`nav-active-${layoutKey}`}
                    className="absolute inset-0 rounded-2xl bg-[var(--glass-top)] shadow-[0_1px_2px_rgba(0,0,0,0.12),inset_0_1px_0_var(--glass-highlight)] ring-1 ring-line"
                    transition={springSnappy}
                  />
                )}
                <span className="absolute inset-0 rounded-2xl bg-fill opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                <Icon
                  size={18}
                  className={cn('relative z-10 transition-colors', active ? 'text-accent' : 'text-subtle group-hover:text-muted')}
                />
                <span className="relative z-10">{label}</span>
              </AppLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
