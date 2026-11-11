'use client';

import { AnimatePresence, motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { CalendarArrowUp, Check, Clock, Ellipsis, Flame, Minus, Pencil, PenLine, RotateCcw, SkipForward, Timer, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Menu } from '@/components/ui/Menu';
import { cn } from '@/lib/cn';
import { formatInstantTime, formatTime, timeToMinutes } from '@/lib/date';
import { feedback } from '@/lib/feedback';
import { colorOf } from '@/lib/habits/meta';
import type { DayItem } from '@/lib/habits/schedule';
import { describeSchedule, scheduleAt } from '@/lib/habits/schedule';
import { useCoarsePointer } from '@/lib/hooks';
import { completionLevel, entryValue, formatAmount, isMeasured, needsValueInput } from '@/lib/habits/values';
import { DURATION, EASE_OUT, springBouncy, springSnappy, tween } from '@/lib/motion';
import { actions } from '@/lib/store/app-store';
import { toast } from '@/lib/store/toast-store';
import { ui } from '@/lib/store/ui-store';
import type { DateKey } from '@/types';
import { habitIcon } from './habit-icons';
import { checkHabit, useDeleteHabit } from './useHabitActions';

interface HabitCardProps {
  item: DayItem;
  date: DateKey;
  nowMinutes: number;
  timeFormat: '24h' | '12h';
  timeZone: string;
  streak?: { current: number; unit: 'day' | 'week' };
}

const PARTICLES = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
  return { x: Math.cos(a), y: Math.sin(a), s: i % 2 ? 4 : 5 };
});

export function CheckButton({
  done,
  count,
  target,
  color,
  onClick,
  label,
  size = 48,
  measured,
  minimum,
}: {
  done: boolean;
  count: number;
  target: number;
  color: string;
  onClick: () => void;
  label: string;
  size?: number;
  measured?: boolean;
  minimum?: boolean;
}) {
  const multi = measured ?? target > 1;
  const r = size / 2 - 3;
  const c = 2 * Math.PI * r;
  const progress = done ? 1 : multi ? count / target : 0;
  // Вспышка частиц только при переходе в «выполнено», а не при первом рендере
  const [burst, setBurst] = useState(0);
  const wasDone = useRef(done);
  useEffect(() => {
    if (done && !wasDone.current) setBurst((b) => b + 1);
    wasDone.current = done;
  }, [done]);

  return (
    <motion.button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      aria-pressed={done}
      whileTap={{ scale: 0.84 }}
      whileHover={{ scale: 1.06 }}
      transition={springSnappy}
      className="relative grid shrink-0 place-items-center rounded-full"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={2} className="stroke-[var(--fill-strong)]" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={done ? 'var(--success)' : color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - progress) }}
          transition={tween(DURATION.slow)}
        />
      </svg>
      <motion.span
        className="absolute rounded-full"
        style={{ inset: 5, background: 'linear-gradient(140deg, color-mix(in oklab, var(--success) 80%, white), var(--success))' }}
        initial={false}
        animate={{ scale: done ? 1 : 0, opacity: done ? 1 : 0 }}
        transition={springBouncy}
      />
      <AnimatePresence>
        {burst > 0 && done && (
          <motion.span key={burst} className="pointer-events-none absolute inset-0" aria-hidden initial="a" animate="b" exit={{ opacity: 0 }}>
            <motion.span
              className="absolute inset-0 rounded-full"
              style={{ boxShadow: '0 0 0 2px var(--success)' }}
              variants={{ a: { scale: 0.8, opacity: 0.9 }, b: { scale: 1.8, opacity: 0, transition: { duration: 0.6, ease: 'easeOut' } } }}
            />
            {PARTICLES.map((p, i) => (
              <motion.span
                key={i}
                className="absolute top-1/2 left-1/2 rounded-full"
                style={{ width: p.s, height: p.s, marginLeft: -p.s / 2, marginTop: -p.s / 2, background: i % 3 ? 'var(--success)' : color }}
                variants={{
                  a: { x: 0, y: 0, opacity: 1, scale: 1 },
                  b: { x: p.x * size * 0.85, y: p.y * size * 0.85, opacity: 0, scale: 0.4, transition: { duration: 0.6, ease: EASE_OUT } },
                }}
              />
            ))}
          </motion.span>
        )}
      </AnimatePresence>
      <span className="relative z-10">
        {minimum && !done ? (
          <Check size={size * 0.38} className="text-success" strokeWidth={3} aria-hidden />
        ) : done ? (
          <motion.svg width={size * 0.42} height={size * 0.42} viewBox="0 0 24 24" fill="none" aria-hidden>
            <motion.path
              d="M5 12.5l4.5 4.5L19 7.5"
              stroke="white"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.35, delay: 0.08, ease: 'easeOut' }}
            />
          </motion.svg>
        ) : multi ? (
          <span className="text-[12px] font-semibold text-fg tabular-nums">
            {`${fmt(count)}/${fmt(target)}`.length <= 5 ? (
              <>
                {fmt(count)}
                <span className="text-subtle">/{fmt(target)}</span>
              </>
            ) : (
              `${Math.min(999, Math.round((count / target) * 100))}%`
            )}
          </span>
        ) : (
          <Check size={size * 0.38} className="text-subtle opacity-40" aria-hidden />
        )}
      </span>
    </motion.button>
  );
}

const SWIPE_THRESHOLD = 88;

function fmt(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

export function HabitCard({ item, date, nowMinutes, timeFormat, timeZone, streak }: HabitCardProps) {
  const { habit, entry, status, flexible, weekly } = item;
  const color = colorOf(habit.color);
  const Icon = habitIcon(habit.icon);
  const done = status === 'completed';
  const missed = status === 'missed';
  const count = entryValue(entry);
  const level = completionLevel(habit, count);
  const measured = isMeasured(habit);
  const fullDone = done && (!measured || level === 'full');
  const overdue = status === 'pending' && habit.time !== null && timeToMinutes(habit.time) < nowMinutes;
  const deleteHabit = useDeleteHabit();
  const coarse = useCoarsePointer();
  const canSkip = !flexible && !done && !missed;

  // Swipe: вправо — выполнить/снять, влево — пропустить
  const x = useMotionValue(0);
  const rightReveal = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const leftReveal = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);
  const iconScaleR = useTransform(x, [20, SWIPE_THRESHOLD], [0.6, 1.1]);
  const iconScaleL = useTransform(x, [-SWIPE_THRESHOLD, -20], [1.1, 0.6]);

  const onCheck = () => {
    if (needsValueInput(habit) && !fullDone) ui.openValueSheet(habit.id, date);
    else checkHabit(habit.id, date);
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > SWIPE_THRESHOLD) checkHabit(habit.id, date);
    else if (info.offset.x < -SWIPE_THRESHOLD && canSkip) {
      actions.skipHabit(habit.id, date);
      feedback.tap();
      toast({ tone: 'info', title: 'Пропущено', description: habit.name, action: { label: 'Отменить', onClick: () => actions.clearEntry(habit.id, date) } });
    }
  };

  const statusPill = done
    ? level === 'minimum'
      ? { text: 'Минимум выполнен', cls: 'text-success bg-success/10' }
      : { text: entry?.completedAt ? `Готово · ${formatInstantTime(entry.completedAt, timeZone, timeFormat)}` : 'Выполнено', cls: 'text-success bg-success/10' }
    : missed
      ? { text: 'Пропущено', cls: 'text-danger bg-danger/10' }
      : overdue
        ? { text: 'Ждёт отметки', cls: 'text-warning bg-warning/10' }
        : { text: 'Предстоит', cls: 'text-muted bg-fill' };

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, transition: tween(DURATION.fast) }}
      transition={{ layout: springSnappy, ...tween(DURATION.base) }}
      className="relative"
    >
      {coarse && (
        <div aria-hidden className="absolute inset-0 overflow-hidden rounded-[22px]">
          <motion.div style={{ opacity: rightReveal }} className="absolute inset-0 flex items-center bg-success/20 pl-6 text-success">
            <motion.span style={{ scale: iconScaleR }} className="flex items-center gap-2 text-sm font-semibold">
              {done ? <RotateCcw size={18} /> : <Check size={18} />} {done ? 'Снять' : 'Готово'}
            </motion.span>
          </motion.div>
          {canSkip && (
            <motion.div style={{ opacity: leftReveal }} className="absolute inset-0 flex items-center justify-end bg-warning/20 pr-6 text-warning">
              <motion.span style={{ scale: iconScaleL }} className="flex items-center gap-2 text-sm font-semibold">
                Пропустить <SkipForward size={18} />
              </motion.span>
            </motion.div>
          )}
        </div>
      )}

      <motion.article
        drag={coarse ? 'x' : false}
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: canSkip ? 0.55 : 0.08, right: 0.55 }}
        dragSnapToOrigin
        onDragEnd={onDragEnd}
        style={{ x }}
        whileHover={coarse ? undefined : { y: -2 }}
        transition={springSnappy}
        className={cn(
          'glass glass-hover spotlight group relative flex touch-pan-y items-center gap-3.5 rounded-[22px] p-3.5 pr-2.5 sm:gap-4 sm:p-4 sm:pr-3',
          missed && 'opacity-75',
        )}
        aria-label={`${habit.name}: ${statusPill.text}`}
      >
        {/* Мягкий зелёный акцент выполненной привычки */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[22px]"
          initial={false}
          animate={{ opacity: done ? 1 : 0 }}
          transition={tween(DURATION.slow)}
          style={{
            background: 'linear-gradient(100deg, color-mix(in oklab, var(--success) 14%, transparent), transparent 65%)',
            boxShadow: 'inset 0 0 0 1px color-mix(in oklab, var(--success) 22%, transparent)',
          }}
        />

        <motion.span
          className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl sm:h-12 sm:w-12"
          animate={done ? { rotate: [0, -8, 6, 0], scale: [1, 1.08, 1] } : { rotate: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: EASE_OUT }}
          style={{
            background: `color-mix(in oklab, ${color} 16%, transparent)`,
            color,
            boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${color} 26%, transparent)`,
          }}
        >
          <Icon size={20} />
        </motion.span>

        <div className="relative min-w-0 flex-1">
          <h3 className={cn('truncate text-[15px] font-semibold tracking-[-0.01em] transition-colors duration-500', done ? 'text-muted' : 'text-fg')}>
            {habit.name}
          </h3>
          {habit.description && <p className="mt-0.5 truncate text-[13px] text-subtle">{habit.description}</p>}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-subtle">
            {habit.time && (
              <span className={cn('inline-flex items-center gap-1', overdue && 'text-warning')}>
                <Clock size={12} /> {formatTime(habit.time, timeFormat)}
              </span>
            )}
            {measured && (
              <span className={cn('tabular-nums', level === 'full' ? 'text-success' : level === 'minimum' ? 'text-success/80' : '')}>
                {formatAmount(habit, count)} / {formatAmount(habit, habit.targetPerDay)}
              </span>
            )}
            {flexible && weekly && (
              <span>
                Неделя: {weekly.done}/{weekly.target}
              </span>
            )}
            {!flexible && <span className="hidden sm:inline">{describeSchedule(scheduleAt(habit, date))}</span>}
            {streak && streak.current > 0 && (
              <span className="inline-flex items-center gap-1 text-warning/90">
                <Flame size={12} /> {streak.current} {streak.unit === 'week' ? 'нед.' : 'дн.'}
              </span>
            )}
            <span className={cn('rounded-md px-1.5 py-0.5 text-[11px] font-medium sm:hidden', statusPill.cls)}>{statusPill.text}</span>
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={statusPill.text}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={tween(DURATION.fast)}
            className={cn('relative hidden shrink-0 rounded-lg px-2.5 py-1 text-[12px] font-medium sm:inline', statusPill.cls)}
          >
            {statusPill.text}
          </motion.span>
        </AnimatePresence>

        <div className="relative flex shrink-0 items-center gap-0.5">
          <AnimatePresence initial={false}>
            {(habit.kind === 'count' || habit.kind === 'sessions') && count > 0 && !fullDone && (
              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                onClick={() => {
                  actions.stepHabit(habit.id, date, -1);
                  feedback.undo();
                }}
                aria-label={`Убрать одно повторение: ${habit.name}`}
                className="grid h-9 w-9 place-items-center rounded-xl text-subtle hover:bg-fill hover:text-fg"
              >
                <Minus size={16} />
              </motion.button>
            )}
          </AnimatePresence>
          <CheckButton
            done={fullDone}
            minimum={done && !fullDone}
            measured={measured}
            count={count}
            target={habit.targetPerDay}
            color={color}
            onClick={onCheck}
            label={
              fullDone
                ? `Снять отметку: ${habit.name}`
                : needsValueInput(habit)
                  ? `Записать результат: ${habit.name} (${formatAmount(habit, count)} из ${formatAmount(habit, habit.targetPerDay)})`
                  : measured
                    ? `Добавить: ${habit.name} (${count} из ${habit.targetPerDay})`
                    : `Отметить выполненной: ${habit.name}`
            }
          />
          <Menu
            label={`Действия: ${habit.name}`}
            trigger={<Ellipsis size={18} />}
            items={[
              { label: 'Изменить', icon: <Pencil size={15} />, onSelect: () => ui.openHabitModal(habit.id) },
              { label: 'Записать результат', icon: <PenLine size={15} />, onSelect: () => ui.openValueSheet(habit.id, date), hidden: !measured },
              { label: 'Фокус-сессия', icon: <Timer size={15} />, onSelect: () => ui.openTimer(habit.id) },
              {
                label: 'Перенести на завтра',
                icon: <CalendarArrowUp size={15} />,
                hidden: flexible || done,
                onSelect: () => {
                  actions.moveToTomorrow(habit.id, date);
                  toast({ tone: 'info', title: 'Перенесено на завтра', description: habit.name, action: { label: 'Отменить', onClick: () => actions.clearEntry(habit.id, date) } });
                },
              },
              {
                label: 'Пропустить сегодня',
                icon: <SkipForward size={15} />,
                onSelect: () => actions.skipHabit(habit.id, date),
                hidden: !canSkip,
              },
              {
                label: 'Сбросить отметку',
                icon: <RotateCcw size={15} />,
                onSelect: () => actions.clearEntry(habit.id, date),
                hidden: !entry,
              },
              { label: 'Удалить', icon: <Trash2 size={15} />, tone: 'danger', onSelect: () => void deleteHabit(habit) },
            ]}
          />
        </div>
      </motion.article>
    </motion.div>
  );
}
