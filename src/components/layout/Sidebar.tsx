'use client';

import { FlaskConical, Plus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { cn } from '@/lib/cn';
import { useApp } from '@/lib/store/app-store';
import { ui } from '@/lib/store/ui-store';
import { Avatar } from './Avatar';
import { Logo } from './Logo';
import { NavList } from './NavList';

export function SidebarContent({ layoutKey, onNavigate }: { layoutKey: string; onNavigate?: () => void }) {
  const name = useApp((s) => s.data.settings.userName);
  const mode = useApp((s) => s.mode);
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-2 pt-1 pb-7">
        <Link href="/" onClick={onNavigate} aria-label="На главную" className="rounded-xl">
          <Logo />
        </Link>
        {mode === 'demo' && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-warning/12 px-2 py-1 text-[10px] font-semibold tracking-wide text-warning uppercase">
            <FlaskConical size={11} /> Демо
          </span>
        )}
      </div>

      <p className="px-3.5 pb-2 text-[11px] font-medium tracking-[0.12em] text-subtle uppercase">Меню</p>
      <NavList layoutKey={layoutKey} onNavigate={onNavigate} />

      <div className="mt-6 px-1">
        <Button variant="primary" className="w-full" onClick={() => ui.openHabitModal()}>
          <Plus size={17} /> Новая привычка
        </Button>
      </div>

      <div className="mt-auto space-y-3 pt-6">
        <Link
          href="/settings"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-fill"
        >
          <Avatar name={name || 'Гость'} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-fg">{name || 'Гость'}</span>
            <span className="block text-xs text-subtle">Профиль и настройки</span>
          </span>
        </Link>
        <ThemeToggle />
      </div>
    </div>
  );
}

export function Sidebar({ className }: { className?: string }) {
  return (
    <aside className={cn('fixed inset-y-0 left-0 z-30 hidden w-[272px] p-4 lg:block', className)}>
      <div className="glass h-full rounded-[28px] p-4">
        <SidebarContent layoutKey="desktop" />
      </div>
    </aside>
  );
}
