'use client';

import { AnimatePresence, Reorder, motion, useDragControls } from 'framer-motion';
import { CalendarArrowUp, ChevronLeft, ChevronRight, Clock3, GripVertical, Moon, RotateCcw, Sun, Sunrise, Sunset, Undo2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { CheckButton } from '@/components/habits/HabitCard';
import { habitIcon } from '@/components/habits/habit-icons';
import { checkHabit } from '@/components/habits/useHabitActions';
import { PageHeader } from '@/components/layout/PageHeader';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Hint } from '@/components/ui/Hint';
import { LiquidProgress } from '@/components/ui/LiquidProgress';
import { cn } from '@/lib/cn';
import { addDays, formatLongDate, formatTime, formatWeekday, plural } from '@/lib/date';
import { BLOCK_ORDER, buildTimeline, groupByBlock, type TimelineItem } from '@/lib/day';
import { feedback } from '@/lib/feedback';
import { BLOCK_LABEL, type TimeBlock } from '@/lib/habits/insights';
import { colorOf } from '@/lib/habits/meta';
import { getDayItems, summarizeDay } from '@/lib/habits/schedule';
import { completionLevel, entryValue, formatAmount, isMeasured, needsValueInput } from '@/lib/habits/values';
import { DURATION, springSnappy, stagger, tween } from '@/lib/motion';
import { actions, useApp } from '@/lib/store/app-store';
import { useToday } from '@/lib/store/clock';
import { toast } from '@/lib/store/toast-store';
import { ui } from '@/lib/store/ui-store';
import type { DateKey } from '@/types';

const BLOCK_ICON: Record<TimeBlock, typeof Sun> = { morning: Sunrise, day: Sun, evening: Sunset, anytime: Clock3 };

const PHASE: Record<TimelineItem['phase'], { label: string; dot: string }> = {
  done: { label: 'Выполнено', dot: 'bg-success' },
  missed: { label: 'Пропущено', dot: 'bg-danger' },
  now: { label: 'Сейчас', dot: 'bg-accent' },
  next: { label: 'Далее', dot: 'bg-accent/60' },
  past: { label: 'Время прошло', dot: 'bg-warning' },
  later: { label: 'Предстоит', dot: 'bg-fill-strong' },
};

function TimeEditor({ item, date, timeFormat, disabled }: { item: TimelineItem; date: DateKey; timeFormat: '24h' | '12h'; disabled: boolean }) {
  const [editing, setEditing] = useState(false);
  if (editing && !disabled) {
    return (
      <span className="flex items-center gap-1">
        <input
          type="time"
          autoFocus
          aria-label={`Новое время: ${item.habit.name}`}
          defaultValue={item.time ?? '09:00'}
          onBlur={(e) => {
            setEditing(false);
            const v = e.target.value;
            if (v && v !== item.time) {
              actions.rescheduleTime(item.habit.id, date, v === item.habit.time ? null : v);
              toast({ tone: 'info', title: 'Время перенесено', description: `${item.habit.name} · ${formatTime(v, timeFormat)}` });
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') setEditing(false);
          }}
          className="h-8 w-[92px] rounded-lg border border-line bg-fill px-2 text-[13px] text-fg focus:border-accent/50 focus:outline-none"
        />
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setEditing(true)}
        title="Перенести на другое время"
        aria-label={`Время: ${item.time ? formatTime(item.time, timeFormat) : 'не задано'}. Изменить`}
        className={cn(
          'h-8 rounded-lg px-2 text-[13px] font-semibold tabular-nums transition-colors',
          disabled ? 'text-subtle' : 'text-fg hover:bg-fill',
          item.rescheduled && 'text-accent',
        )}
      >
        {item.time ? formatTime(item.time, timeFormat) : '—:—'}
      </button>
      {item.rescheduled && !disabled && (
        <button
          type="button"
          onClick={() => actions.rescheduleTime(item.habit.id, date, null)}
          aria-label="Вернуть исходное время"
          title="Вернуть исходное время"
          className="grid h-7 w-7 place-items-center rounded-lg text-subtle hover:bg-fill hover:text-fg"
        >
          <RotateCcw size={12} />
        </button>
      )}
    </span>
  );
}

function Row({
  item,
  date,
  today,
  timeFormat,
  onDragEnd,
}: {
  item: TimelineItem;
  date: DateKey;
  today: DateKey;
  timeFormat: '24h' | '12h';
  onDragEnd: () => void;
}) {
  const controls = useDragControls();
  const { habit, entry } = item;
  const Icon = habitIcon(habit.icon);
  const color = colorOf(habit.color);
  const value = entryValue(entry);
  const level = completionLevel(habit, value);
  const measured = isMeasured(habit);
  const done = item.status === 'completed';
  const fullDone = done && (!measured || level === 'full');
  const future = date > today;
  const phase = PHASE[item.phase];

  return (
    <Reorder.Item value={habit.id} dragListener={false} dragControls={controls} onDragEnd={onDragEnd} transition={springSnappy} whileDrag={{ scale: 1.02 }} className="relative list-none">
      <div className="relative flex gap-3 pl-1">
        {/* Точка на временной оси */}
        <div className="relative flex w-4 shrink-0 justify-center pt-5" aria-hidden>
          <span className={cn('relative z-10 h-2.5 w-2.5 rounded-full ring-4 ring-[var(--bg)]', phase.dot)} />
          {item.phase === 'now' && <span className="absolute top-[18px] h-3.5 w-3.5 animate-ping rounded-full bg-accent/50" />}
        </div>
        <div
          className={cn(
            'glass glass-hover spotlight mb-2.5 flex min-w-0 flex-1 items-center gap-2.5 rounded-[20px] p-2.5 pr-2 sm:gap-3 sm:p-3',
            item.phase === 'now' && 'shadow-[var(--shadow),var(--glow)]',
            (item.phase === 'done' || item.phase === 'missed') && 'opacity-80',
          )}
        >
          <button
            type="button"
            aria-label={`Переместить «${habit.name}»`}
            onPointerDown={(e) => controls.start(e)}
            className="hidden h-9 w-6 shrink-0 cursor-grab touch-none place-items-center rounded-lg text-subtle hover:text-fg sm:grid"
          >
            <GripVertical size={15} />
          </button>
          <TimeEditor item={item} date={date} timeFormat={timeFormat} disabled={done || date < today} />
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, color }}>
            <Icon size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <p className={cn('truncate text-[14px] font-medium', done ? 'text-muted' : 'text-fg')}>{habit.name}</p>
            <p className="truncate text-[11.5px] text-subtle">
              <span className={cn(item.phase === 'now' && 'font-medium text-accent', item.phase === 'past' && 'text-warning')}>{phase.label}</span>
              {measured && ` · ${formatAmount(habit, value)} / ${formatAmount(habit, habit.targetPerDay)}`}
              {item.entry?.extra && ' · перенесено сюда'}
            </p>
          </div>
          {!done && !item.flexible && !future && date === today && (
            <button
              type="button"
              onClick={() => {
                actions.moveToTomorrow(habit.id, date);
                feedback.tap();
                toast({ tone: 'info', title: 'Перенесено на завтра', description: habit.name, action: { label: 'Отменить', onClick: () => actions.clearEntry(habit.id, date) } });
              }}
              aria-label={`Перенести на завтра: ${habit.name}`}
              title="Перенести на завтра"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-subtle transition-colors hover:bg-fill hover:text-fg"
            >
              <CalendarArrowUp size={16} />
            </button>
          )}
          {!future && (
            <CheckButton
              size={40}
              done={fullDone}
              minimum={done && !fullDone}
              measured={measured}
              count={value}
              target={habit.targetPerDay}
              color={color}
              onClick={() => (needsValueInput(habit) && !fullDone ? ui.openValueSheet(habit.id, date) : checkHabit(habit.id, date))}
              label={fullDone ? `Снять отметку: ${habit.name}` : `Отметить: ${habit.name}`}
            />
          )}
        </div>
      </div>
    </Reorder.Item>
  );
}

function Block({
  block,
  items,
  date,
  today,
  timeFormat,
  allIds,
}: {
  block: TimeBlock;
  items: TimelineItem[];
  date: DateKey;
  today: DateKey;
  timeFormat: '24h' | '12h';
  allIds: string[];
}) {
  const [ids, setIds] = useState(items.map((i) => i.habit.id));
  const key = items.map((i) => i.habit.id).join();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setIds(items.map((i) => i.habit.id)), [key]);
  const byId = Object.fromEntries(items.map((i) => [i.habit.id, i]));
  const BIcon = BLOCK_ICON[block];
  const done = items.filter((i) => i.status === 'completed').length;

  const commit = () => {
    const blockSet = new Set(ids);
    const rest = allIds.filter((id) => !blockSet.has(id));
    // Порядок блока встраивается на место первого его элемента
    const firstIdx = allIds.findIndex((id) => blockSet.has(id));
    const next = [...rest];
    next.splice(Math.max(0, firstIdx), 0, ...ids);
    actions.setDayOrder(date, next);
  };

  return (
    <motion.section variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }} aria-label={BLOCK_LABEL[block]}>
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-fill text-accent">
          <BIcon size={14} />
        </span>
        <h2 className="text-[13px] font-semibold tracking-[0.06em] text-muted uppercase">{block === 'anytime' ? 'В любое время' : BLOCK_LABEL[block]}</h2>
        <span className="text-xs text-subtle tabular-nums">
          {done}/{items.length}
        </span>
      </div>
      <div className="relative">
        <span className="absolute top-2 bottom-4 left-[12px] w-px bg-line" aria-hidden />
        <Reorder.Group axis="y" values={ids} onReorder={setIds} className="relative">
          {ids.map((id) =>
            byId[id] ? <Row key={id} item={byId[id]} date={date} today={today} timeFormat={timeFormat} onDragEnd={commit} /> : null,
          )}
        </Reorder.Group>
      </div>
    </motion.section>
  );
}

export default function MyDayPage() {
  const habitsMap = useApp((s) => s.data.habits);
  const entries = useApp((s) => s.data.entries);
  const dayOrder = useApp((s) => s.data.dayOrder);
  const settings = useApp((s) => s.data.settings);
  const { today, nowMinutes } = useToday();
  const [date, setDate] = useState<DateKey>(today);
  const [dir, setDir] = useState(0);
  const ws = settings.weekStartsOn;
  const habits = useMemo(() => Object.values(habitsMap), [habitsMap]);

  const items = useMemo(() => getDayItems(habits, entries, date, today, ws), [habits, entries, date, today, ws]);
  const timeline = useMemo(() => buildTimeline(items, dayOrder[date], date === today, nowMinutes), [items, dayOrder, date, today, nowMinutes]);
  const blocks = groupByBlock(timeline);
  const summary = summarizeDay(items, date, today);
  const allIds = timeline.map((t) => t.habit.id);
  const moved = useMemo(
    () => Object.values(entries).filter((e) => e.date === date && e.status === 'moved' && habitsMap[e.habitId]),
    [entries, date, habitsMap],
  );
  const nowItem = timeline.find((t) => t.phase === 'now') ?? timeline.find((t) => t.phase === 'next');

  const go = (n: number) => {
    setDir(n);
    setDate(addDays(date, n));
  };

  return (
    <>
      <PageHeader
        eyebrow="Мой день"
        title={date === today ? 'План на сегодня' : formatWeekday(date)}
        description="Привычки на временной шкале: перенесите время, поменяйте порядок или отложите на завтра."
        actions={
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" aria-label="Предыдущий день" onClick={() => go(-1)}>
              <ChevronLeft size={18} />
            </Button>
            <Button variant={date === today ? 'subtle' : 'ghost'} size="sm" onClick={() => { setDir(date < today ? 1 : -1); setDate(today); }}>
              Сегодня
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Следующий день" onClick={() => go(1)}>
              <ChevronRight size={18} />
            </Button>
          </div>
        }
      />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={date}
          initial={{ opacity: 0, x: dir * 30 }}
          animate={{ opacity: 1, x: 0, transition: tween(DURATION.base) }}
          exit={{ opacity: 0, x: dir * -30, transition: tween(DURATION.fast) }}
          className="grid gap-5 lg:grid-cols-12"
        >
          <div className="space-y-4 lg:order-2 lg:col-span-4">
            <div className="glass glass-hover spotlight flex items-center gap-5 rounded-[28px] p-5 lg:flex-col lg:items-start">
              <LiquidProgress
                value={summary.scheduled ? summary.completed / summary.scheduled : 0}
                size={112}
                color={summary.state === 'full' ? 'var(--success)' : 'var(--accent)'}
                label="Прогресс дня"
              >
                <p className="text-[26px] font-semibold tracking-[-0.04em] text-fg tabular-nums drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
                  <AnimatedNumber value={summary.scheduled ? Math.round((summary.completed / summary.scheduled) * 100) : 0} />%
                </p>
              </LiquidProgress>
              <div>
                <p className="text-sm text-subtle">{formatLongDate(date)}</p>
                <p className="mt-1 text-lg font-semibold tracking-[-0.02em] text-fg">
                  {summary.completed} из {summary.scheduled} {plural(summary.scheduled, ['привычки', 'привычек', 'привычек'])}
                </p>
                {date === today && nowItem && (
                  <p className="mt-1 text-[13px] text-muted">
                    {nowItem.phase === 'now' ? 'Сейчас' : 'Далее'}: <span className="text-fg">{nowItem.habit.name}</span>
                    {nowItem.time ? ` · ${formatTime(nowItem.time, settings.timeFormat)}` : ''}
                  </p>
                )}
              </div>
            </div>
            {moved.length > 0 && (
              <div className="glass rounded-[24px] p-4">
                <p className="mb-2 flex items-center gap-2 text-[13px] font-medium text-muted">
                  <CalendarArrowUp size={14} /> Перенесено на другой день
                </p>
                <ul className="space-y-1.5">
                  {moved.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-2 rounded-xl bg-fill px-3 py-2 text-sm">
                      <span className="truncate text-fg">{habitsMap[e.habitId]?.name}</span>
                      <button
                        type="button"
                        onClick={() => actions.clearEntry(e.habitId, date)}
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs text-accent hover:bg-accent/10"
                      >
                        <Undo2 size={12} /> Вернуть
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Hint id="myday-intro">
              Нажмите на время, чтобы перенести привычку только на этот день. Ручка слева (на компьютере) меняет порядок внутри блока.
            </Hint>
          </div>

          <div className="lg:order-1 lg:col-span-8">
            {timeline.length === 0 ? (
              <EmptyState
                icon={<Moon size={26} />}
                title={date < today ? 'В этот день привычки не были запланированы' : 'Свободный день'}
                description="По расписанию здесь ничего нет. Можно отдохнуть или добавить новую привычку."
                action={
                  <Button variant="primary" onClick={() => ui.openHabitModal()}>
                    Новая привычка
                  </Button>
                }
              />
            ) : (
              <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
                {BLOCK_ORDER.filter((b) => blocks[b].length).map((b) => (
                  <Block key={b} block={b} items={blocks[b]} date={date} today={today} timeFormat={settings.timeFormat} allIds={allIds} />
                ))}
              </motion.div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
