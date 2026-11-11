'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, SkipForward, Sparkles, Timer } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { habitIcon } from '@/components/habits/habit-icons';
import { checkHabit } from '@/components/habits/useHabitActions';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ProgressBar } from '@/components/ui/Progress';
import { feedback } from '@/lib/feedback';
import { colorOf } from '@/lib/habits/meta';
import { entryValue, formatAmount, isMeasured, needsValueInput } from '@/lib/habits/values';
import { slide, springBouncy } from '@/lib/motion';
import { useApp } from '@/lib/store/app-store';
import { useToday } from '@/lib/store/clock';
import { ui } from '@/lib/store/ui-store';
import type { Habit } from '@/types';

/** Пошаговое прохождение рутины: одна привычка за раз. */
export function RoutineRunner({ routineId, onClose }: { routineId: string | null; onClose: () => void }) {
  const routine = useApp((s) => (routineId ? s.data.routines[routineId] : undefined));
  const habitsMap = useApp((s) => s.data.habits);
  const entries = useApp((s) => s.data.entries);
  const { today } = useToday();
  const steps = useMemo(() => (routine?.habitIds ?? []).map((id) => habitsMap[id]).filter((h): h is Habit => !!h), [routine, habitsMap]);
  const [step, setStep] = useState(0);
  const [results, setResults] = useState<('done' | 'skipped')[]>([]);

  useEffect(() => {
    if (!routineId) return;
    // Начинаем с первого невыполненного шага
    const first = steps.findIndex((h) => entries[`${h.id}:${today}`]?.status !== 'completed');
    setStep(first === -1 ? 0 : first);
    setResults(steps.map((h) => (entries[`${h.id}:${today}`]?.status === 'completed' ? 'done' : 'skipped')).slice(0, Math.max(0, first)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routineId]);

  const finished = step >= steps.length;
  const habit = steps[step];
  const doneCount = results.filter((r) => r === 'done').length;

  const advance = (r: 'done' | 'skipped') => {
    setResults((x) => [...x.slice(0, step), r]);
    setStep((s) => s + 1);
    if (step + 1 >= steps.length) feedback.allDone();
  };

  const complete = () => {
    if (!habit) return;
    const isDone = entries[`${habit.id}:${today}`]?.status === 'completed';
    if (!isDone) checkHabit(habit.id, today);
    advance('done');
  };

  return (
    <Modal
      open={!!routineId && !!routine}
      onClose={onClose}
      size="sm"
      title={routine?.name ?? ''}
      description={finished ? 'Рутина пройдена' : `Шаг ${Math.min(step + 1, steps.length)} из ${steps.length}`}
    >
      <ProgressBar value={steps.length ? Math.min(step, steps.length) / steps.length : 0} label="Прогресс рутины" className="mb-6" />
      <div className="relative min-h-[260px]">
        <AnimatePresence mode="wait" initial={false}>
          {finished ? (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={springBouncy} className="flex flex-col items-center pt-4 text-center">
              <span className="grid h-20 w-20 place-items-center rounded-full bg-success text-white">
                <Sparkles size={32} />
              </span>
              <h3 className="mt-5 text-xl font-semibold tracking-[-0.02em] text-fg">Рутина завершена</h3>
              <p className="mt-1 text-sm text-muted">
                Выполнено {doneCount} из {steps.length}
              </p>
              <Button variant="primary" className="mt-6" onClick={onClose}>
                Готово
              </Button>
            </motion.div>
          ) : habit ? (
            <motion.div key={habit.id} {...slide(1, 40)} className="flex flex-col items-center text-center">
              {(() => {
                const I = habitIcon(habit.icon);
                const color = colorOf(habit.color);
                const value = entryValue(entries[`${habit.id}:${today}`]);
                const already = entries[`${habit.id}:${today}`]?.status === 'completed';
                return (
                  <>
                    <span className="grid h-20 w-20 place-items-center rounded-[26px]" style={{ background: `color-mix(in oklab, ${color} 18%, transparent)`, color }}>
                      <I size={34} />
                    </span>
                    <h3 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-fg">{habit.name}</h3>
                    {habit.description && <p className="mt-1 text-sm text-muted">{habit.description}</p>}
                    {isMeasured(habit) && (
                      <p className="mt-2 text-sm text-subtle tabular-nums">
                        {formatAmount(habit, value)} / {formatAmount(habit, habit.targetPerDay)}
                      </p>
                    )}
                    {already && <p className="mt-2 text-sm text-success">Уже выполнено сегодня</p>}
                    <div className="mt-7 flex w-full flex-col gap-2">
                      <Button variant="primary" size="lg" onClick={complete}>
                        <Check size={17} /> {already ? 'Дальше' : 'Выполнено'}
                      </Button>
                      <div className="grid grid-cols-2 gap-2">
                        {needsValueInput(habit) ? (
                          <Button variant="subtle" onClick={() => ui.openValueSheet(habit.id, today)}>
                            Записать результат
                          </Button>
                        ) : (
                          <Button variant="subtle" onClick={() => ui.openTimer(habit.id)}>
                            <Timer size={15} /> Таймер
                          </Button>
                        )}
                        <Button variant="ghost" onClick={() => advance('skipped')}>
                          <SkipForward size={15} /> Пропустить шаг
                        </Button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          ) : (
            <p className="text-center text-sm text-muted">В рутине нет привычек</p>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
}
