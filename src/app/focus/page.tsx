'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { CircleCheck, CircleDashed, Crosshair, Pause, Play, RotateCcw, Square, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import { habitIcon } from '@/components/habits/habit-icons';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Select } from '@/components/ui/Field';
import { CardHeader, GlassCard } from '@/components/ui/GlassCard';
import { StatsCard } from '@/components/ui/StatsCard';
import { cn } from '@/lib/cn';
import { WEEKDAY_SHORT, formatInstantTime, formatShortDate, weekdayOf } from '@/lib/date';
import { focusStats, formatDuration } from '@/lib/focus';
import { colorOf } from '@/lib/habits/meta';
import { KIND_META } from '@/lib/habits/values';
import { DURATION, EASE_OUT, springBouncy, stagger, tween } from '@/lib/motion';
import { actions, useApp } from '@/lib/store/app-store';
import { useToday } from '@/lib/store/clock';
import { useStore } from '@/lib/store/create-store';
import { formatClock, timer, timerStore } from '@/lib/store/timer-store';
import { toast } from '@/lib/store/toast-store';

const PRESETS = [5, 15, 25, 45, 60, 90];

export default function FocusPage() {
  const t = useStore(timerStore, (s) => s);
  const habitsMap = useApp((s) => s.data.habits);
  const sessionsMap = useApp((s) => s.data.focusSessions);
  const settings = useApp((s) => s.data.settings);
  const { today, timeZone } = useToday();
  const habits = useMemo(() => Object.values(habitsMap).filter((h) => !h.archivedOn).sort((a, b) => a.order - b.order), [habitsMap]);
  const sessions = useMemo(() => Object.values(sessionsMap).sort((a, b) => b.startedAt.localeCompare(a.startedAt)), [sessionsMap]);
  const stats = useMemo(() => focusStats(sessions, today, settings.weekStartsOn), [sessions, today, settings.weekStartsOn]);
  const running = t.endAt !== null;
  const started = t.startedAt !== null;
  const progress = t.finished ? 1 : t.durationMs ? 1 - t.remainingMs / t.durationMs : 0;
  const minutes = Math.round(t.durationMs / 60_000);
  const maxDay = Math.max(1, ...stats.days.map((d) => d.minutes));
  const linked = t.habitId ? habitsMap[t.habitId] : undefined;

  const size = 280;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <>
      <PageHeader eyebrow="Фокус" title="Глубокая работа без суеты" description="Таймер концентрации с привязкой к привычке. Время сессий для привычек типа «Время» добавляется к результату дня автоматически." />

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid gap-4 lg:grid-cols-12 lg:gap-5">
        <GlassCard className="flex flex-col items-center p-6 sm:p-8 lg:col-span-7">
          <div className="relative" style={{ width: size, height: size, maxWidth: '100%' }}>
            <div
              aria-hidden
              className="absolute inset-6 rounded-full blur-3xl transition-opacity duration-700"
              style={{ background: `radial-gradient(circle, color-mix(in oklab, ${t.finished ? 'var(--success)' : 'var(--accent)'} 40%, transparent), transparent 70%)`, opacity: running ? 0.9 : 0.35 }}
            />
            <svg viewBox={`0 0 ${size} ${size}`} className="relative h-full w-full -rotate-90" aria-hidden>
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
                animate={{ strokeDashoffset: c * (1 - progress) }}
                transition={{ duration: running ? 0.25 : DURATION.slow, ease: 'linear' }}
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center" aria-live="polite">
              <div>
                <p className="text-[58px] leading-none font-semibold tracking-[-0.05em] text-fg tabular-nums">{formatClock(t.remainingMs)}</p>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={t.finished ? 'f' : running ? 'r' : started ? 'p' : 'i'}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={tween(DURATION.fast)}
                    className={cn('mt-2 text-sm', t.finished ? 'text-success' : 'text-subtle')}
                  >
                    {t.finished ? 'Сессия завершена' : running ? (linked ? linked.name : 'Фокус') : started ? 'Пауза' : `${minutes} минут`}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <Button variant="ghost" size="icon" aria-label="Сбросить без сохранения" onClick={() => timer.reset()} disabled={!started && !t.finished}>
              <RotateCcw size={18} />
            </Button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              whileHover={{ scale: 1.04 }}
              transition={springBouncy}
              onClick={() => (running ? timer.pause() : timer.start())}
              aria-label={running ? 'Пауза' : started ? 'Продолжить' : 'Начать'}
              className="grid h-[72px] w-[72px] place-items-center rounded-full bg-fg text-bg shadow-[0_16px_36px_-12px_var(--ring)]"
            >
              {running ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
            </motion.button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Остановить и сохранить"
              disabled={!started}
              onClick={() => {
                const ms = timer.stop();
                toast({ tone: 'info', title: ms ? 'Сессия сохранена' : 'Сессия остановлена', description: ms ? `${Math.round(ms / 60000)} мин в истории` : 'Меньше минуты — не сохраняется' });
              }}
            >
              <Square size={16} />
            </Button>
          </div>

          <div className="mt-7 w-full max-w-md space-y-4">
            <div className="flex flex-wrap justify-center gap-1.5" role="group" aria-label="Длительность">
              {PRESETS.map((m) => (
                <Chip key={m} active={minutes === m} onClick={() => !started && timer.setDuration(m)} className={cn(started && 'opacity-50')}>
                  {m} мин
                </Chip>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="focus-min" className="shrink-0 text-[13px] text-muted">
                Своя длительность
              </label>
              <input
                id="focus-min"
                type="number"
                min={1}
                max={240}
                disabled={started}
                value={minutes}
                onChange={(e) => timer.setDuration(Number(e.target.value) || 1)}
                className="h-10 w-20 rounded-xl border border-line bg-fill px-3 text-center text-sm text-fg tabular-nums focus:outline-none disabled:opacity-50"
              />
              <span className="text-[13px] text-subtle">мин</span>
            </div>
            <div>
              <label htmlFor="focus-habit" className="mb-2 block text-[13px] font-medium text-muted">
                Привычка
              </label>
              <Select id="focus-habit" value={t.habitId ?? ''} onChange={(e) => timer.setHabit(e.target.value || null)}>
                <option value="">Без привязки</option>
                {habits.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                    {h.kind === 'duration' || h.kind === 'sessions' ? ` · ${KIND_META[h.kind].label.toLowerCase()}` : ''}
                  </option>
                ))}
              </Select>
              {linked && (linked.kind === 'duration' || linked.kind === 'sessions') && (
                <p className="mt-2 text-xs text-subtle">
                  {linked.kind === 'duration' ? 'Минуты сессии добавятся к результату дня.' : 'Завершённая сессия засчитается как +1.'}
                </p>
              )}
            </div>
          </div>
        </GlassCard>

        <div className="space-y-4 lg:col-span-5 lg:space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <StatsCard label="Сегодня" value={formatDuration(stats.todayMs)} hint={`${stats.todayCount} сесс.`} icon={<Crosshair size={16} />} tone="accent" />
            <StatsCard label="Неделя" value={formatDuration(stats.weekMs)} hint={`всего ${formatDuration(stats.totalMs)}`} />
          </div>
          <GlassCard className="p-5 sm:p-6">
            <CardHeader title="Последние 7 дней" subtitle="Минуты концентрации" className="mb-4" />
            <div className="flex h-32 items-end gap-2" role="list">
              {stats.days.map((d, i) => (
                <div key={d.date} role="listitem" aria-label={`${formatShortDate(d.date)}: ${d.minutes} мин`} className="group flex h-full flex-1 flex-col items-center gap-1.5">
                  <span className="text-[10px] text-subtle opacity-0 transition-opacity group-hover:opacity-100 tabular-nums">{d.minutes}</span>
                  <div className="relative w-full flex-1">
                    <motion.div
                      className="absolute inset-x-0 bottom-0 origin-bottom rounded-lg"
                      style={{ height: `${Math.max(4, (d.minutes / maxDay) * 100)}%`, background: d.minutes ? 'linear-gradient(180deg, var(--accent-2), var(--accent))' : 'var(--fill-strong)' }}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ duration: 0.7, delay: i * 0.05, ease: EASE_OUT }}
                    />
                  </div>
                  <span className={cn('text-[10px]', d.date === today ? 'font-semibold text-accent' : 'text-subtle')}>{WEEKDAY_SHORT[weekdayOf(d.date)]}</span>
                </div>
              ))}
            </div>
          </GlassCard>
          {stats.byHabit.length > 0 && (
            <GlassCard className="p-5 sm:p-6">
              <CardHeader title="По привычкам" subtitle="Всё время" className="mb-3" />
              <ul className="space-y-2">
                {stats.byHabit.slice(0, 5).map(({ habitId, ms }) => {
                  const h = habitId ? habitsMap[habitId] : undefined;
                  const I = h ? habitIcon(h.icon) : Crosshair;
                  return (
                    <li key={habitId ?? 'none'} className="flex items-center gap-2.5 text-sm">
                      <I size={15} style={{ color: h ? colorOf(h.color) : 'var(--fg-subtle)' }} />
                      <span className="min-w-0 flex-1 truncate text-fg">{h ? h.name : 'Без привязки'}</span>
                      <span className="text-xs text-subtle tabular-nums">{formatDuration(ms)}</span>
                    </li>
                  );
                })}
              </ul>
            </GlassCard>
          )}
        </div>

        <GlassCard className="p-5 sm:p-6 lg:col-span-12">
          <CardHeader title="История сессий" subtitle={`${sessions.length} всего · ${stats.completedCount} завершено`} className="mb-4" />
          {sessions.length === 0 ? (
            <p className="rounded-2xl bg-fill px-4 py-8 text-center text-sm text-muted">Сессий пока нет. Запустите первую — она появится здесь.</p>
          ) : (
            <ul className="divide-y divide-[var(--hairline)]">
              <AnimatePresence initial={false}>
                {sessions.slice(0, 30).map((s) => {
                  const h = s.habitId ? habitsMap[s.habitId] : undefined;
                  return (
                    <motion.li key={s.id} layout exit={{ opacity: 0, height: 0 }} className="flex items-center gap-3 py-2.5 text-sm">
                      {s.completed ? <CircleCheck size={16} className="shrink-0 text-success" /> : <CircleDashed size={16} className="shrink-0 text-subtle" />}
                      <span className="w-24 shrink-0 text-xs text-subtle tabular-nums">
                        {formatShortDate(s.date)}, {formatInstantTime(s.startedAt, timeZone, settings.timeFormat)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-fg">{h ? h.name : 'Без привязки'}</span>
                      <span className="shrink-0 text-xs text-muted tabular-nums">
                        {formatDuration(s.actualMs)}
                        {!s.completed && ` из ${Math.round(s.plannedMs / 60000)}`}
                      </span>
                      <button
                        type="button"
                        aria-label="Удалить сессию"
                        onClick={() => actions.deleteFocusSession(s.id)}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-subtle hover:bg-fill hover:text-danger"
                      >
                        <Trash2 size={13} />
                      </button>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          )}
        </GlassCard>
      </motion.div>
    </>
  );
}
