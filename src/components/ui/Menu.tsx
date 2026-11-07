'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Portal } from './Portal';

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  tone?: 'default' | 'danger';
  hidden?: boolean;
}

/** Выпадающее меню, рендерится в портале (не обрезается карточками). */
export function Menu({
  label,
  trigger,
  items,
  className,
}: {
  label: string;
  trigger: ReactNode;
  items: MenuItem[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number; up: boolean } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const visible = items.filter((i) => !i.hidden);

  const close = useCallback((focusTrigger = true) => {
    setOpen(false);
    if (focusTrigger) btnRef.current?.focus();
  }, []);

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const estimated = visible.length * 44 + 16;
    const up = r.bottom + estimated > window.innerHeight - 12 && r.top > estimated;
    setPos({ top: up ? r.top - 6 : r.bottom + 6, right: Math.max(8, window.innerWidth - r.right), up });
  }, [open, visible.length]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => listRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus(), 20);
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!listRef.current?.contains(target) && !btnRef.current?.contains(target)) close(false);
    };
    const onScroll = () => close(false);
    document.addEventListener('pointerdown', onDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('pointerdown', onDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, close]);

  const onKeyDown = (e: KeyboardEvent) => {
    const nodes = Array.from(listRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const idx = nodes.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      nodes[(idx + 1) % nodes.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      nodes[(idx - 1 + nodes.length) % nodes.length]?.focus();
    } else if (e.key === 'Tab') {
      close(false);
    }
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={cn(
          'grid h-9 w-9 place-items-center rounded-xl text-subtle transition-colors hover:bg-fill hover:text-fg',
          open && 'bg-fill text-fg',
          className,
        )}
      >
        {trigger}
      </button>
      <Portal>
        <AnimatePresence>
          {open && pos && (
            <motion.div
              ref={listRef}
              id={menuId}
              role="menu"
              aria-label={label}
              onKeyDown={onKeyDown}
              initial={{ opacity: 0, scale: 0.94, y: pos.up ? 6 : -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.12 } }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: 'fixed',
                right: pos.right,
                top: pos.up ? undefined : pos.top,
                bottom: pos.up ? window.innerHeight - pos.top : undefined,
                transformOrigin: pos.up ? 'bottom right' : 'top right',
              }}
              className="glass-solid z-[80] min-w-[210px] rounded-2xl p-1.5"
            >
              {visible.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.stopPropagation();
                    close(false);
                    item.onSelect();
                  }}
                  className={cn(
                    'flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm transition-colors outline-none',
                    item.tone === 'danger'
                      ? 'text-danger hover:bg-danger/10 focus:bg-danger/10'
                      : 'text-fg hover:bg-fill focus:bg-fill',
                  )}
                >
                  <span className="opacity-75">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>
    </>
  );
}
