'use client';

import { FlaskConical, Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AppLink } from '@/components/layout/AppLink';
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
  const [shortcut, setShortcut] = useState('Ctrl K');
  useEffect(() => setShortcut(/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : 'Ctrl K'), []);
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-2 pt-1 pb-6">
        <AppLink href="/" onClick={onNavigate} aria-label="На главную" className="rounded-xl">
          <Logo />
        </AppLink>
        {mode === 'demo' && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-warning/12 px-2 py-1 text-[10px] font-semibold tracking-wide text-warning uppercase">
            <FlaskConical size={11} /> Демо
          </span>
        )}
      </div>

      <div className="scrollbar-none -mx-1 min-h-0 flex-1 overflow-y-auto px-1">
      <NavList layoutKey={layoutKey} onNavigate={onNavigate} />

      <div className="mt-6 px-1">
        <Button variant="primary" className="w-full" onClick={() => ui.openHabitModal()}>
          <Plus size={17} /> Новая привычка
        </Button>
        <button
          type="button"
          onClick={() => ui.setCommand(true)}
          className="mt-2 flex h-10 w-full items-center gap-2.5 rounded-2xl px-3.5 text-[13px] whitespace-nowrap text-subtle transition-colors hover:bg-fill hover:text-fg"
        >
          <Search size={15} className="shrink-0" /> Поиск и команды
          <kbd className="ml-auto shrink-0 rounded-md border border-line px-1.5 py-0.5 font-sans text-[10.5px] whitespace-nowrap">{shortcut}</kbd>
        </button>
      </div>

      </div>

      <div className="space-y-3 pt-4">
        <AppLink
          href="/settings"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-fill"
        >
          <Avatar name={name || 'Гость'} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-fg">{name || 'Гость'}</span>
            <span className="block text-xs text-subtle">Профиль и настройки</span>
          </span>
        </AppLink>
        <ThemeToggle />
      </div>
    </div>
  );
}

export function Sidebar({ className }: { className?: string }) {
  return (
    <aside className={cn('fixed inset-y-0 left-0 z-30 hidden w-[272px] p-4 lg:block', className)}>
      <div className="glass sidebar-live h-full overflow-hidden rounded-[28px] p-4">
        <SidebarContent layoutKey="desktop" />
      </div>
    </aside>
  );
}
