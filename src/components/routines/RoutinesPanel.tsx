'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Ellipsis, Pencil, Play, Plus, Route, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { habitIcon } from '@/components/habits/habit-icons';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Menu } from '@/components/ui/Menu';
import { ProgressBar } from '@/components/ui/Progress';
import { cn } from '@/lib/cn';
import { colorOf } from '@/lib/habits/meta';
import { DURATION, springSoft, tween } from '@/lib/motion';
import { actions, useApp } from '@/lib/store/app-store';
import { useToday } from '@/lib/store/clock';
import { toast } from '@/lib/store/toast-store';
import type { Habit } from '@/types';
import { ROUTINE_TEMPLATES, RoutineModal } from './RoutineModal';
import { RoutineRunner } from './RoutineRunner';

export function RoutinesPanel() {
  const routinesMap = useApp((s) => s.data.routines);
  const habitsMap = useApp((s) => s.data.habits);
  const entries = useApp((s) => s.data.entries);
  const { today } = useToday();
  const routines = useMemo(() => Object.values(routinesMap).sort((a, b) => a.order - b.order), [routinesMap]);
  const [modal, setModal] = useState<{ open: boolean; id: string | null; template: (typeof ROUTINE_TEMPLATES)[number] | null }>({ open: false, id: null, template: null });
  const [running, setRunning] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const hasHabits = Object.values(habitsMap).some((h) => !h.archivedOn);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {ROUTINE_TEMPLATES.map((t) => {
          const I = habitIcon(t.icon);
          return (
            <button
              key={t.name}
              type="button"
              disabled={!hasHabits}
              onClick={() => setModal({ open: true, id: null, template: t })}
              className="glass glass-hover lift inline-flex h-10 items-center gap-2 rounded-2xl px-3.5 text-[13px] font-medium text-fg disabled:opacity-40"
            >
              <I size={15} style={{ color: colorOf(t.color) }} /> {t.name}
            </button>
          );
        })}
        <Button variant="subtle" size="sm" className="h-10" disabled={!hasHabits} onClick={() => setModal({ open: true, id: null, template: null })}>
          <Plus size={15} /> Своя рутина
        </Button>
      </div>

      {routines.length === 0 ? (
        <EmptyState
          icon={<Route size={26} />}
          title="Рутин пока нет"
          description={hasHabits ? 'Объедините привычки в последовательность — например, утро: вода → медитация → чтение — и проходите её шаг за шагом.' : 'Сначала создайте несколько привычек.'}
        />
      ) : (
        <motion.ul layout className="grid gap-3 lg:grid-cols-2">
          {routines.map((r) => {
            const I = habitIcon(r.icon);
            const color = colorOf(r.color);
            const steps = r.habitIds.map((id) => habitsMap[id]).filter((h): h is Habit => !!h);
            const done = steps.filter((h) => entries[`${h.id}:${today}`]?.status === 'completed').length;
            const open = expanded === r.id;
            return (
              <motion.li key={r.id} layout transition={springSoft} className="glass glass-hover spotlight list-none overflow-hidden rounded-[24px]">
                <motion.div layout="position" className="flex items-center gap-3 p-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl" style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, color }}>
                    <I size={21} />
                  </span>
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setExpanded(open ? null : r.id)} aria-expanded={open}>
                    <p className="truncate text-[15px] font-semibold text-fg">{r.name}</p>
                    <p className="mt-0.5 text-xs text-subtle">
                      {steps.length} шаг. · сегодня {done}/{steps.length}
                    </p>
                  </button>
                  <motion.button
                    type="button"
                    aria-label={open ? 'Свернуть' : 'Показать шаги'}
                    onClick={() => setExpanded(open ? null : r.id)}
                    animate={{ rotate: open ? 180 : 0 }}
                    className="grid h-9 w-9 place-items-center rounded-xl text-subtle hover:bg-fill hover:text-fg"
                  >
                    <ChevronDown size={16} />
                  </motion.button>
                  <Button variant="primary" size="sm" onClick={() => setRunning(r.id)} disabled={!steps.length}>
                    <Play size={14} /> Начать
                  </Button>
                  <Menu
                    label={`Действия: ${r.name}`}
                    trigger={<Ellipsis size={18} />}
                    items={[
                      { label: 'Изменить', icon: <Pencil size={15} />, onSelect: () => setModal({ open: true, id: r.id, template: null }) },
                      {
                        label: 'Удалить',
                        icon: <Trash2 size={15} />,
                        tone: 'danger',
                        onSelect: () => {
                          const removed = actions.deleteRoutine(r.id);
                          if (removed) toast({ title: 'Рутина удалена', description: 'Сами привычки не затронуты', action: { label: 'Отменить', onClick: () => actions.restoreRoutine(removed) } });
                        },
                      },
                    ]}
                  />
                </motion.div>
                <div className="px-4 pb-4">
                  <ProgressBar value={steps.length ? done / steps.length : 0} color={color} height={4} label={`Прогресс: ${r.name}`} />
                </div>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.ol
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1, transition: tween(DURATION.base) }}
                      exit={{ height: 0, opacity: 0, transition: tween(DURATION.fast) }}
                      className="overflow-hidden border-t border-line"
                    >
                      {steps.map((h, i) => {
                        const HI = habitIcon(h.icon);
                        const isDone = entries[`${h.id}:${today}`]?.status === 'completed';
                        return (
                          <li key={h.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                            <span className={cn('grid h-6 w-6 place-items-center rounded-full text-[11px] tabular-nums', isDone ? 'bg-success text-white' : 'bg-fill text-subtle')}>
                              {i + 1}
                            </span>
                            <HI size={15} style={{ color: colorOf(h.color) }} />
                            <span className={cn('truncate', isDone ? 'text-muted' : 'text-fg')}>{h.name}</span>
                          </li>
                        );
                      })}
                    </motion.ol>
                  )}
                </AnimatePresence>
              </motion.li>
            );
          })}
        </motion.ul>
      )}

      <RoutineModal open={modal.open} routineId={modal.id} template={modal.template} onClose={() => setModal((m) => ({ ...m, open: false }))} />
      <RoutineRunner routineId={running} onClose={() => setRunning(null)} />
    </div>
  );
}
