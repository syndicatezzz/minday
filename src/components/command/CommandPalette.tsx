'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  Check,
  CornerDownLeft,
  Download,
  Monitor,
  Moon,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Sun,
  Timer,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { habitIcon } from '@/components/habits/habit-icons';
import { checkHabit } from '@/components/habits/useHabitActions';
import { Portal } from '@/components/ui/Portal';
import { exportBackup } from '@/lib/backup';
import { cn } from '@/lib/cn';
import { getDayItems } from '@/lib/habits/schedule';
import { DURATION, springSoft, tween } from '@/lib/motion';
import { NAV_ITEMS } from '@/lib/nav';
import { navigateWithTransition } from '@/lib/navigation';
import { actions, useApp } from '@/lib/store/app-store';
import { useToday } from '@/lib/store/clock';
import { useStore } from '@/lib/store/create-store';
import { toast } from '@/lib/store/toast-store';
import { ui, uiStore } from '@/lib/store/ui-store';

interface Command {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: ReactNode;
  keywords?: string;
  run: () => void;
}

function I({ icon: Icon }: { icon: LucideIcon }) {
  return <Icon size={16} />;
}

export const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

/** Командная палитра: Cmd/Ctrl + K — быстрый доступ ко всему приложению. */
export function CommandPalette() {
  const open = useStore(uiStore, (s) => s.commandOpen);
  const router = useRouter();
  const habitsMap = useApp((s) => s.data.habits);
  const entries = useApp((s) => s.data.entries);
  const ws = useApp((s) => s.data.settings.weekStartsOn);
  const { today } = useToday();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Глобальное сочетание клавиш
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        ui.setCommand(!uiStore.get().commandOpen);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(0);
    const previous = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = '';
      setQuery('');
      previous?.focus?.({ preventScroll: true });
    };
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    const close = () => ui.setCommand(false);
    const list: Command[] = [];
    const q = query.trim();
    list.push(
      { id: 'new', group: 'Действия', label: 'Новая привычка', icon: <I icon={Plus} />, keywords: 'создать добавить', run: () => ui.openHabitModal() },
      { id: 'review', group: 'Действия', label: 'Итоги недели', icon: <I icon={Sparkles} />, keywords: 'weekly review неделя обзор', run: () => ui.setReview(true) },
      { id: 'timer', group: 'Действия', label: 'Запустить таймер', icon: <I icon={Timer} />, keywords: 'фокус помидор', run: () => ui.openTimer() },
      { id: 'reminder', group: 'Действия', label: 'Новое напоминание', icon: <I icon={Bell} />, keywords: 'уведомление', run: () => ui.openReminderModal() },
    );

    const habits = Object.values(habitsMap);
    for (const it of getDayItems(habits, entries, today, today, ws)) {
      const HIcon = habitIcon(it.habit.icon);
      const done = it.status === 'completed';
      list.push({
        id: `toggle-${it.habit.id}`,
        group: 'Сегодня',
        label: done ? `Снять отметку: ${it.habit.name}` : `Отметить: ${it.habit.name}`,
        hint: done ? 'Выполнено' : undefined,
        keywords: `${it.habit.name} выполнить отметить`,
        icon: done ? <I icon={RotateCcw} /> : <HIcon size={16} />,
        run: () => {
          const r = checkHabit(it.habit.id, today);
          close();
          if (r === 'completed') toast({ title: 'Отмечено', description: it.habit.name });
        },
      });
    }

    for (const n of NAV_ITEMS) {
      list.push({
        id: `nav-${n.href}`,
        group: 'Переход',
        label: n.label,
        hint: n.title,
        keywords: n.title,
        icon: <I icon={n.icon} />,
        run: () => {
          close();
          navigateWithTransition(router, n.href);
        },
      });
    }

    list.push(
      { id: 'theme-dark', group: 'Тема', label: 'Тёмная тема', icon: <I icon={Moon} />, keywords: 'dark', run: () => actions.updateSettings({ theme: 'dark' }) },
      { id: 'theme-light', group: 'Тема', label: 'Светлая тема', icon: <I icon={Sun} />, keywords: 'light', run: () => actions.updateSettings({ theme: 'light' }) },
      { id: 'theme-system', group: 'Тема', label: 'Как в системе', icon: <I icon={Monitor} />, keywords: 'system auto', run: () => actions.updateSettings({ theme: 'system' }) },
      { id: 'export', group: 'Данные', label: 'Экспорт в JSON', icon: <I icon={Download} />, keywords: 'резервная копия backup', run: () => exportBackup() },
    );
    if (q) {
      list.push({
        id: 'quick-add',
        group: 'Создать',
        label: `Добавить привычку «${q}»`,
        hint: 'Каждый день',
        icon: <I icon={Zap} />,
        run: () => {
          const id = actions.quickAddHabit(q);
          close();
          if (id) toast({ title: 'Привычка добавлена', description: q, action: { label: 'Настроить', onClick: () => ui.openHabitModal(id) } });
        },
      });
    }
    return list;
  }, [query, habitsMap, entries, today, ws, router]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.id === 'quick-add' || `${c.label} ${c.keywords ?? ''} ${c.group}`.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const run = (c: Command | undefined) => {
    if (!c) return;
    ui.setCommand(false);
    window.setTimeout(c.run, 10);
  };

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(filtered.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(filtered[active]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      ui.setCommand(false);
    } else if (e.key === 'Tab') {
      e.preventDefault();
    }
  };

  let lastGroup = '';

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[70] flex items-start justify-center px-3 pt-[12vh] sm:pt-[16vh]">
            <motion.div
              className="absolute inset-0 bg-black/30 backdrop-blur-[4px] dark:bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={tween(DURATION.fast)}
              onClick={() => ui.setCommand(false)}
              aria-hidden
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Командная палитра"
              initial={{ opacity: 0, scale: 0.96, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -6, transition: tween(DURATION.fast) }}
              transition={springSoft}
              onKeyDown={onKeyDown}
              className="glass-solid relative w-full max-w-xl overflow-hidden rounded-[24px]"
            >
              <div className="flex items-center gap-3 border-b border-line px-5">
                <Search size={18} className="shrink-0 text-subtle" aria-hidden />
                <input
                  ref={inputRef}
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Поиск команды или название новой привычки…"
                  aria-label="Команда"
                  role="combobox"
                  aria-expanded="true"
                  aria-controls="command-list"
                  aria-activedescendant={filtered[active] ? `cmd-${filtered[active].id}` : undefined}
                  className="h-14 min-w-0 flex-1 bg-transparent text-[15px] text-fg placeholder:text-subtle focus:outline-none"
                />
                <kbd className="hidden rounded-md border border-line px-1.5 py-0.5 text-[11px] text-subtle sm:block">Esc</kbd>
              </div>
              <div ref={listRef} id="command-list" role="listbox" className="max-h-[min(60vh,420px)] overflow-y-auto overscroll-contain p-2">
                {filtered.length === 0 && <p className="px-3 py-8 text-center text-sm text-subtle">Ничего не найдено</p>}
                {filtered.map((c, i) => {
                  const showGroup = c.group !== lastGroup;
                  lastGroup = c.group;
                  const isActive = i === active;
                  return (
                    <div key={c.id}>
                      {showGroup && <p className="px-3 pt-3 pb-1.5 text-[11px] font-medium tracking-[0.08em] text-subtle uppercase">{c.group}</p>}
                      <button
                        id={`cmd-${c.id}`}
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        data-index={i}
                        tabIndex={-1}
                        onMouseMove={() => !isActive && setActive(i)}
                        onClick={() => run(c)}
                        className={cn('relative flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition-colors', isActive ? 'text-fg' : 'text-muted')}
                      >
                        {isActive && <motion.span layoutId="cmd-active" className="absolute inset-0 rounded-xl bg-fill-strong" transition={springSoft} />}
                        <span className={cn('relative grid h-7 w-7 place-items-center rounded-lg', isActive ? 'bg-accent/15 text-accent' : 'bg-fill text-subtle')}>
                          {c.hint === 'Выполнено' ? <Check size={15} /> : c.icon}
                        </span>
                        <span className="relative min-w-0 flex-1 truncate">{c.label}</span>
                        {c.hint && <span className="relative shrink-0 text-xs text-subtle">{c.hint}</span>}
                        {isActive && <CornerDownLeft size={14} className="relative shrink-0 text-subtle" />}
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 border-t border-line px-5 py-2.5 text-[11px] text-subtle">
                <span>↑↓ выбор</span>
                <span>↵ выполнить</span>
                <span className="ml-auto">{isMac() ? '⌘' : 'Ctrl'} + K</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
