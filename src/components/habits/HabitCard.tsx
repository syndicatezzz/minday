'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, Clock, Ellipsis, Flame, Minus, Pencil, RotateCcw, SkipForward, Trash2 } from 'lucide-react';
import { Menu } from '@/components/ui/Menu';
import { cn } from '@/lib/cn';
import { formatInstantTime, formatTime, timeToMinutes } from '@/lib/date';
import { colorOf } from '@/lib/habits/meta';
import type { DayItem } from '@/lib/habits/schedule';
import { describeSchedule, scheduleAt } from '@/lib/habits/schedule';
import { springSnappy } from '@/lib/motion';
import { actions } from '@/lib/store/app-store';
import { ui } from '@/lib/store/ui-store';
import type { DateKey } from '@/types';
import { habitIcon } from './habit-icons';
import { useDeleteHabit } from './useHabitActions';

interface HabitCardProps {
  item: DayItem;
  date: DateKey;
  nowMinutes: number;
  timeFormat: '24h' | '12h';
  timeZone: string;
  streak?: { current: number; unit: 'day' | 'week' };
}

export function CheckButton({
  done,
  count,
  target,
  color,
  onClick,
  label,
  size = 48,
}: {
  done: boolean;
  count: number;
  target: number;
  color: string;
  onClick: () => void;
  label: string;
  size?: number;
}) {
  const multi = target > 1;
  const r = size / 2 - 3;
  const c = 2 * Math.PI * r;
  const progress = done ? 1 : multi ? count / target : 0;
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={done}
      whileTap={{ scale: 0.86 }}
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
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - progress) }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <motion.span
        className="absolute rounded-full"
        style={{ inset: 5, background: color }}
        initial={false}
        animate={{ scale: done ? 1 : 0, opacity: done ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 26 }}
      />
      {/* Волна при выполнении */}
      <AnimatePresence>
        {done && (
          <motion.span
            key="burst"
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{ boxShadow: `0 0 0 2px ${color}` }}
            initial={{ scale: 0.8, opacity: 0.9 }}
            animate={{ scale: 1.7, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>
      <span className="relative z-10">
        {done ? (
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
            {count}
            <span className="text-subtle">/{target}</span>
          </span>
        ) : (
          <Check size={size * 0.38} className="text-subtle opacity-40" aria-hidden />
        )}
      </span>
    </motion.button>
  );
}

export function HabitCard({ item, date, nowMinutes, timeFormat, timeZone, streak }: HabitCardProps) {
  const { habit, entry, status, flexible, weekly } = item;
  const color = colorOf(habit.color);
  const Icon = habitIcon(habit.icon);
  const done = status === 'completed';
  const missed = status === 'missed';
  const count = entry?.status === 'missed' ? 0 : entry?.count ?? 0;
  const overdue = status === 'pending' && habit.time !== null && timeToMinutes(habit.time) < nowMinutes;
  const deleteHabit = useDeleteHabit();

  const onCheck = () => {
    if (habit.targetPerDay > 1 && !done) actions.stepHabit(habit.id, date, 1);
    else actions.toggleHabit(habit.id, date);
  };

  const statusPill = done
    ? { text: entry?.completedAt ? `Готово · ${formatInstantTime(entry.completedAt, timeZone, timeFormat)}` : 'Выполнено', cls: 'text-success bg-success/10' }
    : missed
      ? { text: 'Пропущено', cls: 'text-danger bg-danger/10' }
      : overdue
        ? { text: 'Ждёт отметки', cls: 'text-warning bg-warning/10' }
        : { text: 'Предстоит', cls: 'text-muted bg-fill' };

  return (
    <motion.article
      layout="position"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ layout: springSnappy, duration: 0.35 }}
      whileHover={{ y: -2 }}
      className={cn('glass group relative flex items-center gap-3.5 rounded-[22px] p-3.5 pr-2.5 sm:gap-4 sm:p-4 sm:pr-3', missed && 'opacity-75')}
      aria-label={`${habit.name}: ${statusPill.text}`}
    >
      {/* Цветовой отблеск выполненной привычки */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[22px]"
        initial={false}
        animate={{ opacity: done ? 1 : 0 }}
        transition={{ duration: 0.5 }}
        style={{ background: `linear-gradient(100deg, color-mix(in oklab, ${color} 13%, transparent), transparent 60%)` }}
      />

      <span
        className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl sm:h-12 sm:w-12"
        style={{
          background: `color-mix(in oklab, ${color} 16%, transparent)`,
          color,
          boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${color} 26%, transparent)`,
        }}
      >
        <Icon size={20} />
      </span>

      <div className="relative min-w-0 flex-1">
        <h3 className={cn('truncate text-[15px] font-semibold tracking-[-0.01em] transition-colors', done ? 'text-muted' : 'text-fg')}>
          {habit.name}
        </h3>
        {habit.description && <p className="mt-0.5 truncate text-[13px] text-subtle">{habit.description}</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-subtle">
          {habit.time && (
            <span className={cn('inline-flex items-center gap-1', overdue && 'text-warning')}>
              <Clock size={12} /> {formatTime(habit.time, timeFormat)}
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

      <span className={cn('relative hidden shrink-0 rounded-lg px-2.5 py-1 text-[12px] font-medium sm:inline', statusPill.cls)}>
        {statusPill.text}
      </span>

      <div className="relative flex shrink-0 items-center gap-0.5">
        <AnimatePresence initial={false}>
          {habit.targetPerDay > 1 && count > 0 && !done && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              onClick={() => actions.stepHabit(habit.id, date, -1)}
              aria-label={`Убрать одно повторение: ${habit.name}`}
              className="grid h-9 w-9 place-items-center rounded-xl text-subtle hover:bg-fill hover:text-fg"
            >
              <Minus size={16} />
            </motion.button>
          )}
        </AnimatePresence>
        <CheckButton
          done={done}
          count={count}
          target={habit.targetPerDay}
          color={color}
          onClick={onCheck}
          label={
            done
              ? `Снять отметку: ${habit.name}`
              : habit.targetPerDay > 1
                ? `Добавить повторение: ${habit.name} (${count} из ${habit.targetPerDay})`
                : `Отметить выполненной: ${habit.name}`
          }
        />
        <Menu
          label={`Действия: ${habit.name}`}
          trigger={<Ellipsis size={18} />}
          items={[
            { label: 'Изменить', icon: <Pencil size={15} />, onSelect: () => ui.openHabitModal(habit.id) },
            {
              label: 'Пропустить сегодня',
              icon: <SkipForward size={15} />,
              onSelect: () => actions.skipHabit(habit.id, date),
              hidden: flexible || done || missed,
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
  );
}
