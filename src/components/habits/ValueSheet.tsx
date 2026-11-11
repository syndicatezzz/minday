'use client';

import { motion } from 'framer-motion';
import { Check, Minus, Plus } from 'lucide-react';
import { useEffect, useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { LiquidProgress } from '@/components/ui/LiquidProgress';
import { Modal } from '@/components/ui/Modal';
import { formatLongDate } from '@/lib/date';
import { feedback } from '@/lib/feedback';
import { colorOf } from '@/lib/habits/meta';
import { completionLevel, entryValue, formatAmount, KIND_META } from '@/lib/habits/values';
import { actions, useApp } from '@/lib/store/app-store';
import { useToday } from '@/lib/store/clock';
import { useStore } from '@/lib/store/create-store';
import { ui, uiStore } from '@/lib/store/ui-store';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';

/** Ввод фактического результата: страницы, минуты, километры, повторения. */
export function ValueSheet() {
  const { open, habitId, date } = useStore(uiStore, (s) => s.valueSheet);
  const habit = useApp((s) => (habitId ? s.data.habits[habitId] : undefined));
  const entry = useApp((s) => (habitId && date ? s.data.entries[`${habitId}:${date}`] : undefined));
  const { today } = useToday();
  const [value, setValue] = useState(0);
  const uid = useId();

  useEffect(() => {
    if (open) setValue(entryValue(entry));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, habitId, date]);

  if (!habit || !date) return <Modal open={false} onClose={() => ui.closeValueSheet()} title="">{null}</Modal>;

  const color = colorOf(habit.color);
  const step = KIND_META[habit.kind].step;
  const level = completionLevel(habit, value);
  const pct = Math.round((value / habit.targetPerDay) * 100);
  const presets = [
    habit.minTarget ? { label: `Минимум · ${formatAmount(habit, habit.minTarget)}`, v: habit.minTarget } : null,
    { label: `Цель · ${formatAmount(habit, habit.targetPerDay)}`, v: habit.targetPerDay },
  ].filter((x): x is { label: string; v: number } => !!x);

  const save = (e?: FormEvent) => {
    e?.preventDefault();
    const r = actions.setHabitValue(habit.id, date, value);
    if (r === 'completed') feedback.complete();
    else feedback.tap();
    ui.closeValueSheet();
  };

  return (
    <Modal
      open={open}
      onClose={() => ui.closeValueSheet()}
      size="sm"
      title={habit.name}
      description={`${date === today ? 'Сегодня' : formatLongDate(date)} · цель ${formatAmount(habit, habit.targetPerDay)}${habit.minTarget ? `, минимум ${formatAmount(habit, habit.minTarget)}` : ''}`}
      footer={
        <>
          <Button variant="ghost" onClick={() => ui.closeValueSheet()}>
            Отмена
          </Button>
          <Button variant="primary" type="submit" form={`${uid}-f`}>
            <Check size={16} /> Сохранить
          </Button>
        </>
      }
    >
      <form id={`${uid}-f`} onSubmit={save} className="flex flex-col items-center">
        <LiquidProgress value={value / habit.targetPerDay} size={150} color={level === 'full' ? 'var(--success)' : color} label="Доля основной цели">
          <div className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
            <p className="text-[34px] leading-none font-semibold tracking-[-0.04em] text-fg tabular-nums">
              <AnimatedNumber value={pct} />%
            </p>
            <p className="mt-1 text-[11px] text-muted">
              {level === 'full' ? 'Цель достигнута' : level === 'minimum' ? 'Минимум выполнен' : 'от цели'}
            </p>
          </div>
        </LiquidProgress>

        <div className="mt-6 flex items-center gap-2">
          <motion.button
            type="button"
            whileTap={{ scale: 0.88 }}
            aria-label="Уменьшить"
            onClick={() => setValue((v) => Math.max(0, Math.round((v - step) * 100) / 100))}
            className="grid h-12 w-12 place-items-center rounded-2xl bg-fill text-muted hover:bg-fill-strong hover:text-fg"
          >
            <Minus size={18} />
          </motion.button>
          <label htmlFor={`${uid}-v`} className="sr-only">
            Результат
          </label>
          <div className="relative">
            <input
              id={`${uid}-v`}
              data-autofocus
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={Number.isFinite(value) ? String(value) : ''}
              onChange={(e) => setValue(Math.max(0, Number(e.target.value) || 0))}
              className="h-14 w-36 rounded-2xl border border-line bg-fill pr-12 text-center text-2xl font-semibold text-fg tabular-nums focus:border-accent/50 focus:outline-none"
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-subtle">{habit.unit}</span>
          </div>
          <motion.button
            type="button"
            whileTap={{ scale: 0.88 }}
            aria-label="Увеличить"
            onClick={() => setValue((v) => Math.round((v + step) * 100) / 100)}
            className="grid h-12 w-12 place-items-center rounded-2xl bg-fill text-muted hover:bg-fill-strong hover:text-fg"
          >
            <Plus size={18} />
          </motion.button>
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-1.5">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setValue(p.v)}
              className="h-9 rounded-xl border border-line bg-fill px-3 text-[13px] text-muted transition-colors hover:bg-fill-strong hover:text-fg"
            >
              {p.label}
            </button>
          ))}
        </div>
      </form>
    </Modal>
  );
}
