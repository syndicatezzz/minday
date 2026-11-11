'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Menu as MenuIcon, Search, X } from 'lucide-react';
import { AppLink } from '@/components/layout/AppLink';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { cn } from '@/lib/cn';
import { springSnappy, springSoft } from '@/lib/motion';
import { NAV_ITEMS, isActivePath } from '@/lib/nav';
import { useStore } from '@/lib/store/create-store';
import { ui, uiStore } from '@/lib/store/ui-store';
import { Portal } from '@/components/ui/Portal';
import { MobileFab } from './Fab';
import { Logo } from './Logo';
import { SidebarContent } from './Sidebar';

export function MobileTopBar() {
  const open = useStore(uiStore, (s) => s.drawerOpen);
  return (
    <header className="sticky top-0 z-30 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 sm:px-6 lg:hidden">
      <div className="glass flex h-14 items-center justify-between rounded-[20px] pr-2 pl-3">
        <AppLink href="/" aria-label="На главную">
          <Logo />
        </AppLink>
        <div className="flex items-center">
        <button
          type="button"
          onClick={() => ui.setCommand(true)}
          aria-label="Команды и поиск"
          className="grid h-11 w-11 place-items-center rounded-2xl text-muted transition-colors hover:bg-fill hover:text-fg"
        >
          <Search size={19} />
        </button>
        <button
          type="button"
          onClick={() => ui.setDrawer(true)}
          aria-label="Открыть меню"
          aria-expanded={open}
          className="grid h-11 w-11 place-items-center rounded-2xl text-muted transition-colors hover:bg-fill hover:text-fg"
        >
          <MenuIcon size={20} />
        </button>
        </div>
      </div>
    </header>
  );
}

/** Выезжающая боковая панель для планшетов и телефонов. */
export function MobileDrawer() {
  const open = useStore(uiStore, (s) => s.drawerOpen);
  const pathname = usePathname();

  useEffect(() => {
    ui.setDrawer(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && ui.setDrawer(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[55] lg:hidden">
            <motion.div
              className="absolute inset-0 bg-black/35 backdrop-blur-[4px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => ui.setDrawer(false)}
              aria-hidden
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="Меню"
              initial={{ x: '-105%' }}
              animate={{ x: 0 }}
              exit={{ x: '-105%' }}
              transition={springSoft}
              className="glass-solid absolute inset-y-2 left-2 w-[min(300px,calc(100vw-3rem))] rounded-[28px] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
            >
              <button
                type="button"
                onClick={() => ui.setDrawer(false)}
                aria-label="Закрыть меню"
                className="absolute top-4 right-3 z-10 grid h-10 w-10 place-items-center rounded-xl text-subtle hover:bg-fill hover:text-fg"
              >
                <X size={18} />
              </button>
              <SidebarContent layoutKey="drawer" onNavigate={() => ui.setDrawer(false)} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

const BOTTOM_ITEMS = ['/', '/day', '/habits', '/calendar'].map((h) => NAV_ITEMS.find((i) => i.href === h)!);

export function BottomNavigation() {
  const pathname = usePathname() ?? '/';
  const left = BOTTOM_ITEMS.slice(0, 2);
  const right = BOTTOM_ITEMS.slice(2);

  const renderItem = (item: (typeof BOTTOM_ITEMS)[number]) => {
    const active = isActivePath(pathname, item.href);
    const Icon = item.icon;
    return (
      <li key={item.href} className="flex-1">
        <AppLink
          href={item.href}
          aria-current={active ? 'page' : undefined}
          className={cn(
            'relative flex h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[10.5px] font-medium transition-colors',
            active ? 'text-fg' : 'text-subtle',
          )}
        >
          {active && (
            <motion.span
              layoutId="bottom-nav-active"
              className="absolute inset-x-1.5 inset-y-1 rounded-2xl bg-fill-strong"
              transition={springSnappy}
            />
          )}
          <Icon size={20} className={cn('relative z-10', active && 'text-accent')} />
          <span className="relative z-10">{item.label}</span>
        </AppLink>
      </li>
    );
  };

  return (
    <nav
      aria-label="Нижняя навигация"
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
    >
      <ul className="glass-solid mx-auto flex max-w-md items-center gap-1 rounded-[26px] p-1.5">
        {left.map(renderItem)}
        <li className="flex flex-1 justify-center">
          <MobileFab />
        </li>
        {right.map(renderItem)}
      </ul>
    </nav>
  );
}
