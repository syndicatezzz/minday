'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Command, Plus, Sparkles, Timer } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Portal } from '@/components/ui/Portal';
import { cn } from '@/lib/cn';
import { feedback } from '@/lib/feedback';
import { DURATION, springBouncy, springSnappy, tween } from '@/lib/motion';
import { ui } from '@/lib/store/ui-store';

interface FabAction {
  label: string;
  icon: ReactNode;
  run: () => void;
}

const ACTIONS: FabAction[] = [
  { label: 'Новая привычка', icon: <Plus size={18} />, run: () => ui.openHabitModal() },
  { label: 'Таймер', icon: <Timer size={18} />, run: () => ui.openTimer() },
  { label: 'Напоминание', icon: <Bell size={18} />, run: () => ui.openReminderModal() },
  { label: 'Итоги недели', icon: <Sparkles size={18} />, run: () => ui.setReview(true) },
  { label: 'Команды', icon: <Command size={18} />, run: () => ui.setCommand(true) },
];

function useFab() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element;
      if (!ref.current?.contains(t) && !t.closest?.('[data-fab-menu]')) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);
  return { open, setOpen, ref };
}

function ActionList({ onPick, align }: { onPick: (a: FabAction) => void; align: 'right' | 'center' }) {
  return (
    <motion.ul
      role="menu"
      aria-label="Быстрые действия"
      className={cn('flex flex-col gap-2', align === 'right' ? 'items-end' : 'items-center')}
      initial="hidden"
      animate="show"
      exit="hidden"
      variants={{ hidden: { transition: { staggerChildren: 0.03, staggerDirection: -1 } }, show: { transition: { staggerChildren: 0.045 } } }}
    >
      {ACTIONS.map((a) => (
        <motion.li
          key={a.label}
          variants={{ hidden: { opacity: 0, y: 12, scale: 0.9 }, show: { opacity: 1, y: 0, scale: 1, transition: springSnappy } }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => onPick(a)}
            className="glass-solid flex h-11 items-center gap-2.5 rounded-full pr-4 pl-3 text-sm font-medium text-fg transition-transform hover:-translate-y-0.5 active:scale-95"
          >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-accent/15 text-accent">{a.icon}</span>
            {a.label}
          </button>
        </motion.li>
      ))}
    </motion.ul>
  );
}

function FabButton({ open, onClick, size = 56, className }: { open: boolean; onClick: () => void; size?: number; className?: string }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={open ? 'Закрыть быстрые действия' : 'Быстрые действия'}
      aria-expanded={open}
      aria-haspopup="menu"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.9 }}
      transition={springSnappy}
      className={cn('relative grid place-items-center rounded-[20px] bg-fg text-bg shadow-[0_14px_34px_-10px_var(--ring)]', className)}
      style={{ width: size, height: size }}
    >
      <motion.span animate={{ rotate: open ? 135 : 0 }} transition={springBouncy}>
        <Plus size={size * 0.42} />
      </motion.span>
    </motion.button>
  );
}

/** Плавающая кнопка действий на компьютере. */
export function Fab() {
  const { open, setOpen, ref } = useFab();
  const pick = (a: FabAction) => {
    setOpen(false);
    feedback.tap();
    a.run();
  };
  return (
    <div ref={ref} className="fixed right-6 bottom-6 z-[45] hidden flex-col items-end gap-3 lg:flex">
      <AnimatePresence>{open && <ActionList onPick={pick} align="right" />}</AnimatePresence>
      <FabButton open={open} onClick={() => setOpen((o) => !o)} />
    </div>
  );
}

/** Центральная кнопка нижней навигации с тем же меню действий. */
export function MobileFab() {
  const { open, setOpen, ref } = useFab();
  const pick = (a: FabAction) => {
    setOpen(false);
    feedback.tap();
    a.run();
  };
  return (
    <div ref={ref}>
      <FabButton open={open} onClick={() => {
        feedback.tap();
        setOpen((o) => !o);
      }} size={48} className="rounded-[18px]" />
      <Portal>
        <AnimatePresence>
          {open && (
            <>
              <motion.div
                className="fixed inset-0 z-[38] bg-bg/50 backdrop-blur-[3px] lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={tween(DURATION.fast)}
                aria-hidden
              />
              <div className="fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-[41] flex justify-center lg:hidden" data-fab-menu>
                <ActionList onPick={pick} align="center" />
              </div>
            </>
          )}
        </AnimatePresence>
      </Portal>
    </div>
  );
}
