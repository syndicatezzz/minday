'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, LifeBuoy, Plus, Sprout } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { habitIcon } from '@/components/habits/habit-icons';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Modal } from '@/components/ui/Modal';
import { ProgressBar } from '@/components/ui/Progress';
import { Segmented } from '@/components/ui/Segmented';
import { Switch } from '@/components/ui/Switch';
import { diffDays } from '@/lib/date';
import { feedback } from '@/lib/feedback';
import { colorOf } from '@/lib/habits/meta';
import { shouldSuggestRecovery } from '@/lib/habits/recovery';
import { fadeUp } from '@/lib/motion';
import { actions, useApp } from '@/lib/store/app-store';
import { useToday } from '@/lib/store/clock';
import { useStore } from '@/lib/store/create-store';
import { toast } from '@/lib/store/toast-store';
import { ui, uiStore } from '@/lib/store/ui-store';
import type { Habit } from '@/types';

/** Мягкий старт: выбрать 1–3 главные привычки, остальное можно поставить на паузу. */
export function RecoveryModal() {
  const open = useStore(uiStore, (s) => s.recoveryOpen);
  const habitsMap = useApp((s) => s.data.habits);
  const habits = useMemo(() => Object.values(habitsMap).filter((h) => !h.archivedOn).sort((a, b) => a.order - b.order), [habitsMap]);
  const [ids, setIds] = useState<string[]>([]);
  const [pause, setPause] = useState(true);
  const [days, setDays] = useState<'7' | '14'>('7');

  useEffect(() => {
    if (open) {
      setIds([]);
      setPause(true);
      setDays('7');
    }
  }, [open]);

  const start = () => {
    actions.startRecovery(ids, pause, Number(days));
    feedback.tap();
    toast({ title: 'Мягкое возвращение начато', description: 'Фокус на главном — остальное подождёт' });
    ui.setRecovery(false);
  };

  return (
    <Modal
      open={open}
      onClose={() => ui.setRecovery(false)}
      title="Вернуться в ритм мягко"
      description="Выберите 1–3 привычки, с которых удобно начать. История и статистика сохраняются полностью."
      footer={
        <>
          <Button variant="ghost" onClick={() => ui.setRecovery(false)}>
            Не сейчас
          </Button>
          <Button variant="primary" disabled={!ids.length} onClick={start}>
            <Sprout size={16} /> Начать
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap gap-1.5">
          {habits.map((h) => {
            const I = habitIcon(h.icon);
            const active = ids.includes(h.id);
            return (
              <Chip
                key={h.id}
                active={active}
                onClick={() => setIds(active ? ids.filter((x) => x !== h.id) : ids.length >= 3 ? ids : [...ids, h.id])}
                className={!active && ids.length >= 3 ? 'opacity-40' : undefined}
              >
                <I size={14} style={{ color: colorOf(h.color) }} /> {h.name}
              </Chip>
            );
          })}
        </div>
        <p className="text-xs text-subtle">Выбрано {ids.length} из 3</p>
        <div className="glass-subtle flex items-center justify-between gap-4 rounded-2xl p-4">
          <div>
            <p className="text-sm font-medium text-fg">Остальные — на паузу</p>
            <p className="mt-0.5 text-xs text-subtle">Дни паузы не считаются пропусками. Вернуть привычки можно в любой момент.</p>
          </div>
          <Switch checked={pause} onChange={setPause} label="Поставить остальные на паузу" />
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-fg">Длительность</p>
          <Segmented<'7' | '14'>
            ariaLabel="Длительность восстановления"
            size="sm"
            value={days}
            onChange={setDays}
            options={[
              { value: '7', label: '7 дней' },
              { value: '14', label: '14 дней' },
            ]}
          />
        </div>
      </div>
    </Modal>
  );
}

/** Карточка на главной: предложение или текущий режим восстановления. */
export function RecoveryCard() {
  const habitsMap = useApp((s) => s.data.habits);
  const entries = useApp((s) => s.data.entries);
  const recovery = useApp((s) => s.data.meta.recovery);
  const dismissedOn = useApp((s) => s.data.meta.recoveryDismissedOn);
  const ws = useApp((s) => s.data.settings.weekStartsOn);
  const { today } = useToday();
  const habits = useMemo(() => Object.values(habitsMap), [habitsMap]);
  const suggest = useMemo(
    () => !recovery && (!dismissedOn || diffDays(today, dismissedOn) >= 3) && shouldSuggestRecovery(habits, entries, today, ws),
    [recovery, dismissedOn, today, habits, entries, ws],
  );
  const [picking, setPicking] = useState(false);

  if (recovery) {
    const day = Math.min(recovery.targetDays, diffDays(today, recovery.startedOn) + 1);
    const priority = recovery.habitIds.map((id) => habitsMap[id]).filter((h): h is Habit => !!h);
    const paused = recovery.pausedIds.map((id) => habitsMap[id]).filter((h): h is Habit => !!h);
    const doneToday = priority.filter((h) => entries[`${h.id}:${today}`]?.status === 'completed').length;
    const ready = day >= Math.ceil(recovery.targetDays / 2);
    return (
      <motion.section variants={fadeUp} aria-label="Режим восстановления" className="glass glass-hover relative overflow-hidden rounded-[28px] p-5 sm:p-6">
        <div aria-hidden className="pointer-events-none absolute -top-16 -left-10 h-48 w-48 rounded-full bg-success/15 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-[12px] font-medium tracking-wide text-success uppercase">
              <LifeBuoy size={13} /> Мягкое возвращение
            </p>
            <p className="mt-1.5 text-[15px] font-semibold text-fg">
              День {day} из {recovery.targetDays} · сегодня {doneToday}/{priority.length}
            </p>
            <p className="mt-0.5 text-[13px] text-muted">
              {ready && paused.length ? 'Ритм восстанавливается — можно вернуть ещё одну привычку.' : 'Главное сейчас — эти привычки. Остальное подождёт.'}
            </p>
          </div>
          <div className="flex gap-2">
            {paused.length > 0 && (
              <Button size="sm" variant="subtle" onClick={() => setPicking((p) => !p)} aria-expanded={picking}>
                <Plus size={14} /> Вернуть привычку
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                actions.endRecovery();
                toast({ title: 'Обычное расписание восстановлено', description: 'Все привычки снова в плане' });
              }}
            >
              <Check size={14} /> Завершить
            </Button>
          </div>
        </div>
        <ProgressBar className="relative mt-4" value={day / recovery.targetDays} color="var(--success)" height={5} label="Прогресс восстановления" />
        <AnimatePresence initial={false}>
          {picking && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="relative overflow-hidden">
              <div className="flex flex-wrap gap-1.5 pt-4">
                {paused.map((h) => (
                  <Chip
                    key={h.id}
                    onClick={() => {
                      actions.addRecoveryHabit(h.id);
                      setPicking(false);
                      toast({ title: 'Привычка снова в плане', description: h.name });
                    }}
                  >
                    <Plus size={13} /> {h.name}
                  </Chip>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>
    );
  }

  if (!suggest) return null;
  return (
    <motion.section variants={fadeUp} aria-label="Предложение вернуться в ритм" className="glass glass-hover relative overflow-hidden rounded-[28px] p-5 sm:p-6">
      <div aria-hidden className="pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full bg-accent/15 blur-3xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-accent/12 text-accent">
            <Sprout size={18} />
          </span>
          <div>
            <p className="text-[15px] font-semibold text-fg">Начнём с малого?</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
              Последние дни были насыщенными — это нормально. Можно выбрать 1–3 главные привычки и постепенно вернуться к полному плану.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="ghost" onClick={() => actions.dismissRecovery()}>
            Не сейчас
          </Button>
          <Button size="sm" variant="primary" onClick={() => ui.setRecovery(true)}>
            Выбрать главное
          </Button>
        </div>
      </div>
    </motion.section>
  );
}
