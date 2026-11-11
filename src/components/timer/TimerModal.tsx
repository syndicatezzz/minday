'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Pause, Play, RotateCcw, Square, Timer as TimerIcon } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { checkHabit } from '@/components/habits/useHabitActions';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Select } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Portal } from '@/components/ui/Portal';
import { cn } from '@/lib/cn';
import { feedback } from '@/lib/feedback';
import { DURATION, springSoft, tween } from '@/lib/motion';
import { appStore, useApp } from '@/lib/store/app-store';
import { useToday } from '@/lib/store/clock';
import { useStore } from '@/lib/store/create-store';
import { formatClock, timer, timerStore } from '@/lib/store/timer-store';
import { toast } from '@/lib/store/toast-store';
import { ui, uiStore } from '@/lib/store/ui-store';
import { computeToday } from '@/lib/today';
import { notificationChannel } from '@/lib/reminders/notifications';

const PRESETS = [1, 5, 10, 15, 25, 45];

/** Тикает таймер, пока приложение открыто, и сигналит по окончании. */
export function TimerRunner() {
  const running = useStore(timerStore, (s) => s.endAt !== null);
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const r = timer.tick();
      if (!r.finished) return;
      feedback.timer();
      const { habitId } = timerStore.get();
      const data = appStore.get().data;
      const habit = habitId ? data.habits[habitId] : undefined;
      const date = computeToday(data.settings);
      const done = habit ? data.entries[`${habit.id}:${date}`]?.status === 'completed' : false;
      if (data.settings.notificationsEnabled) {
        void notificationChannel.show({ title: 'Фокус-сессия завершена', body: habit ? habit.name : 'Время вышло', tag: 'focus' });
      }
      toast({
        tone: 'reminder',
        title: 'Сессия фокуса завершена',
        description: habit
          ? r.applied === 'duration'
            ? `${habit.name}: время добавлено к результату`
            : r.applied === 'sessions'
              ? `${habit.name}: +1 сессия`
              : habit.name
          : 'Время вышло',
        duration: 10_000,
        action:
          habit && !done && !r.applied
            ? { label: 'Отметить', onClick: () => checkHabit(habit.id, computeToday(appStore.get().data.settings)) }
            : undefined,
      });
    }, 250);
    return () => window.clearInterval(id);
  }, [running]);
  return null;
}

/** Плавающий индикатор работающего таймера, когда окно закрыто. */
export function TimerChip() {
  const s = useStore(timerStore, (x) => x);
  const open = useStore(uiStore, (x) => x.timer.open);
  const pathname = usePathname();
  const visible = !open && pathname !== '/focus' && (s.endAt !== null || (s.remainingMs > 0 && s.remainingMs < s.durationMs));
  return (
    <Portal>
      <AnimatePresence>
        {visible && (
          <motion.button
            type="button"
            onClick={() => ui.openTimer(s.habitId)}
            initial={{ opacity: 0, y: -12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.9 }}
            transition={springSoft}
            aria-label={`Таймер: осталось ${formatClock(s.remainingMs)}`}
            className="glass-solid fixed top-[max(5rem,calc(env(safe-area-inset-top)+4.5rem))] right-4 z-[45] flex h-11 items-center gap-2 rounded-full pr-4 pl-3 text-sm font-semibold text-fg tabular-nums lg:top-6 lg:right-6"
          >
            <span className={cn('grid h-7 w-7 place-items-center rounded-full bg-accent/15 text-accent', s.endAt && 'animate-pulse')}>
              <TimerIcon size={14} />
            </span>
            {formatClock(s.remainingMs)}
          </motion.button>
        )}
      </AnimatePresence>
    </Portal>
  );
}

export function TimerModal() {
  const { open, habitId: presetHabit } = useStore(uiStore, (s) => s.timer);
  const t = useStore(timerStore, (s) => s);
  const habitsMap = useApp((s) => s.data.habits);
  const { today } = useToday();
  const habits = useMemo(() => Object.values(habitsMap).filter((h) => !h.archivedOn).sort((a, b) => a.order - b.order), [habitsMap]);
  const running = t.endAt !== null;
  const progress = t.durationMs ? 1 - t.remainingMs / t.durationMs : 0;

  useEffect(() => {
    if (open && presetHabit && !running) timer.setHabit(presetHabit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, presetHabit]);

  const size = 220;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const minutes = Math.round(t.durationMs / 60_000);

  return (
    <Modal
      open={open}
      onClose={() => ui.closeTimer()}
      size="sm"
      title="Таймер"
      description="Сфокусируйтесь на привычке — по окончании прозвучит мягкий сигнал"
    >
      <div className="flex flex-col items-center">
        <div className="relative my-2" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90" aria-hidden>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-[var(--fill-strong)]" />
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={t.finished ? 'var(--success)' : 'var(--accent)'}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={c}
              animate={{ strokeDashoffset: c * (1 - (t.finished ? 1 : progress)) }}
              transition={{ duration: running ? 0.25 : DURATION.slow, ease: 'linear' }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center" aria-live="polite">
            <div>
              <p className="text-[48px] leading-none font-semibold tracking-[-0.04em] text-fg tabular-nums">{formatClock(t.remainingMs)}</p>
              <AnimatePresence mode="wait">
                <motion.p
                  key={t.finished ? 'f' : running ? 'r' : 'p'}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={tween(DURATION.fast)}
                  className={cn('mt-2 text-xs', t.finished ? 'text-success' : 'text-subtle')}
                >
                  {t.finished ? 'Готово' : running ? 'Идёт' : t.remainingMs < t.durationMs ? 'Пауза' : `${minutes} мин`}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Сбросить без сохранения" onClick={() => timer.reset()}>
            <RotateCcw size={18} />
          </Button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => (running ? timer.pause() : timer.start())}
            aria-label={running ? 'Пауза' : 'Старт'}
            className="grid h-16 w-16 place-items-center rounded-full bg-fg text-bg shadow-[0_12px_30px_-10px_var(--ring)]"
            data-autofocus
          >
            {running ? <Pause size={24} /> : <Play size={24} className="ml-0.5" />}
          </motion.button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Остановить и сохранить"
            disabled={!t.startedAt}
            onClick={() => {
              const ms = timer.stop();
              if (ms) toast({ tone: 'info', title: 'Сессия сохранена', description: `${Math.round(ms / 60000)} мин в истории фокуса` });
            }}
          >
            <Square size={16} />
          </Button>
        </div>

        <div className="mt-6 w-full space-y-4">
          <div className="flex flex-wrap justify-center gap-1.5" role="group" aria-label="Длительность">
            {PRESETS.map((m) => (
              <Chip key={m} active={minutes === m} onClick={() => !running && timer.setDuration(m)} className={cn(running && 'opacity-50')}>
                {m} мин
              </Chip>
            ))}
          </div>
          <div>
            <label htmlFor="timer-habit" className="mb-2 block text-[13px] font-medium text-muted">
              Привычка (необязательно)
            </label>
            <Select id="timer-habit" value={t.habitId ?? ''} onChange={(e) => timer.setHabit(e.target.value || null)}>
              <option value="">Без привычки</option>
              {habits.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </Select>
          </div>
          {t.finished && t.habitId && habitsMap[t.habitId] && (
            <Button
              variant="primary"
              className="w-full"
              onClick={() => {
                const done = appStore.get().data.entries[`${t.habitId}:${today}`]?.status === 'completed';
                if (!done) checkHabit(t.habitId!, today);
                timer.reset();
                ui.closeTimer();
              }}
            >
              Отметить «{habitsMap[t.habitId].name}» выполненной
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
