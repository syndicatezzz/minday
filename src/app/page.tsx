'use client';

import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { CalendarCheck, Plus, Sprout } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SevenDayStats, QuoteCard, StreakCard, WeekStrip } from '@/components/dashboard/SideCards';
import { Celebration } from '@/components/dashboard/Celebration';
import { TodayProgress } from '@/components/dashboard/TodayProgress';
import { WeeklyReviewCard } from '@/components/dashboard/WeeklyReviewCard';
import { FocusWidget, GoalsWidget, JournalWidget } from '@/components/dashboard/MiniWidgets';
import { RecoveryCard } from '@/components/recovery/Recovery';
import { QuickAdd } from '@/components/habits/QuickAdd';
import { HabitCard } from '@/components/habits/HabitCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Hint } from '@/components/ui/Hint';
import { addDays, formatLongDate, formatWeekday, startOfWeek, timeToMinutes } from '@/lib/date';
import { type DayItem, getDayItems, summarizeDay, summarizeRange } from '@/lib/habits/schedule';
import { habitStreak, overallStreak } from '@/lib/habits/streak';
import { stagger } from '@/lib/motion';
import { quoteOfDay } from '@/lib/quotes';
import { feedback } from '@/lib/feedback';
import { useCoarsePointer } from '@/lib/hooks';
import { actions, useApp } from '@/lib/store/app-store';
import { useToday } from '@/lib/store/clock';
import { ui } from '@/lib/store/ui-store';

function sortByTime(a: DayItem, b: DayItem) {
  const ta = a.habit.time ? timeToMinutes(a.habit.time) : 24 * 60;
  const tb = b.habit.time ? timeToMinutes(b.habit.time) : 24 * 60;
  return ta - tb || a.habit.order - b.habit.order;
}

export default function DashboardPage() {
  const habitsMap = useApp((s) => s.data.habits);
  const entries = useApp((s) => s.data.entries);
  const settings = useApp((s) => s.data.settings);
  const widgets = settings.appearance.dashboard;
  const { today, nowMinutes, greeting, timeZone } = useToday();
  const habits = useMemo(() => Object.values(habitsMap), [habitsMap]);
  const ws = settings.weekStartsOn;

  const items = useMemo(() => getDayItems(habits, entries, today, today, ws), [habits, entries, today, ws]);
  const summary = useMemo(() => summarizeDay(items, today, today), [items, today]);
  const streak = useMemo(() => overallStreak(habits, entries, today, ws), [habits, entries, today, ws]);
  const week = useMemo(() => {
    const start = startOfWeek(today, ws);
    return summarizeRange(habits, entries, start, addDays(start, 6), today, ws);
  }, [habits, entries, today, ws]);
  const last7 = useMemo(() => summarizeRange(habits, entries, addDays(today, -6), today, today, ws), [habits, entries, today, ws]);
  const habitStreaks = useMemo(() => {
    const map: Record<string, { current: number; unit: 'day' | 'week' }> = {};
    for (const it of items) map[it.habit.id] = habitStreak(it.habit, entries, today, ws);
    return map;
  }, [items, entries, today, ws]);

  const groups = useMemo(() => {
    const overdue: DayItem[] = [];
    const upcoming: DayItem[] = [];
    const done: DayItem[] = [];
    const skipped: DayItem[] = [];
    for (const it of [...items].sort(sortByTime)) {
      if (it.status === 'completed') done.push(it);
      else if (it.status === 'missed') skipped.push(it);
      else if (it.habit.time && timeToMinutes(it.habit.time) < nowMinutes) overdue.push(it);
      else upcoming.push(it);
    }
    return [
      { id: 'overdue', title: 'Ждут отметки', hint: 'Время прошло, но день ещё не закончился', items: overdue },
      { id: 'upcoming', title: 'Предстоящие', items: upcoming },
      { id: 'done', title: 'Выполненные', items: done },
      { id: 'skipped', title: 'Пропущенные', items: skipped },
    ].filter((g) => g.items.length);
  }, [items, nowMinutes]);

  // Анимация достижения, когда закрыт весь день (один раз за день)
  const celebratedOn = useApp((s) => s.data.meta.celebratedOn);
  const [celebrate, setCelebrate] = useState(false);
  const prevCompleted = useRef<number | null>(null);
  useEffect(() => {
    const prev = prevCompleted.current;
    prevCompleted.current = summary.completed;
    const allDone = summary.scheduled > 0 && summary.completed === summary.scheduled;
    if (prev !== null && prev < summary.completed && allDone && celebratedOn !== today) {
      actions.markCelebrated(today);
      feedback.allDone();
      window.setTimeout(() => setCelebrate(true), 450);
    }
  }, [summary.completed, summary.scheduled, celebratedOn, today]);
  const closeCelebration = useCallback(() => setCelebrate(false), []);
  const coarse = useCoarsePointer();

  const quote = quoteOfDay(today);
  const activeCount = habits.filter((h) => !h.archivedOn).length;
  const name = settings.userName.trim();

  return (
    <>
      <PageHeader
        eyebrow={
          <>
            {greeting}
            {name ? `, ${name}` : ''} · <span className="text-muted">{formatWeekday(today)}, {formatLongDate(today)}</span>
          </>
        }
        title="Сделай сегодняшний день значимым"
        actions={
          <Button variant="primary" onClick={() => ui.openHabitModal()}>
            <Plus size={17} /> Новая привычка
          </Button>
        }
      />

      {activeCount === 0 ? (
        <div className="space-y-4">
        <EmptyState
          icon={<Sprout size={28} />}
          title="Пока нет ни одной привычки"
          description="Начните с чего-то совсем небольшого: стакан воды утром, 10 минут чтения или короткая прогулка."
          action={
            <Button variant="primary" size="lg" onClick={() => ui.openHabitModal()}>
              <Plus size={17} /> Создать первую привычку
            </Button>
          }
        />
        <QuickAdd className="mx-auto max-w-2xl" />
        </div>
      ) : (
        <motion.div variants={stagger} initial="hidden" animate="show" className="grid gap-4 lg:grid-cols-12 lg:gap-5">
          <div className="space-y-4 lg:col-span-8 lg:space-y-5">
            <RecoveryCard />
            <TodayProgress summary={summary} />

            <section aria-labelledby="today-habits" className="pt-2">
              <div className="mb-3 flex items-end justify-between px-1">
                <h2 id="today-habits" className="text-lg font-semibold tracking-[-0.02em] text-fg">
                  Привычки на сегодня
                </h2>
                <span className="text-xs text-subtle tabular-nums">
                  {summary.completed}/{summary.scheduled}
                </span>
              </div>
              <QuickAdd className="mb-3" />
              {coarse ? (
                <Hint id="dashboard-swipe" className="mb-3">
                  Смахните карточку вправо, чтобы отметить выполнение, или влево — чтобы пропустить. Касание круга тоже работает.
                </Hint>
              ) : (
                <Hint id="dashboard-check" className="mb-3">
                  Нажмите на круг справа, чтобы отметить выполнение. Повторное нажатие отменит отметку, а в меню «⋯» можно
                  пропустить привычку, запустить таймер или изменить её. Нажмите Ctrl/⌘ + K для быстрых команд.
                </Hint>
              )}

              {items.length === 0 ? (
                <EmptyState
                  compact
                  className="glass rounded-[24px]"
                  icon={<CalendarCheck size={26} />}
                  title="Сегодня свободный день"
                  description="По расписанию на сегодня нет привычек. Отдохните — или загляните в календарь."
                />
              ) : (
                <LayoutGroup>
                  <div className="space-y-6">
                    {groups.map((g) => (
                      <motion.div key={g.id} layout="position" className="space-y-2.5">
                        <div className="flex items-baseline gap-2 px-1">
                          <h3 className="text-[12px] font-semibold tracking-[0.08em] text-subtle uppercase">{g.title}</h3>
                          <span className="text-[12px] text-subtle tabular-nums">{g.items.length}</span>
                          {g.hint && <span className="hidden text-[12px] text-subtle sm:inline">· {g.hint}</span>}
                        </div>
                        <AnimatePresence initial={false}>
                          {g.items.map((it) => (
                            <HabitCard
                              key={it.habit.id}
                              item={it}
                              date={today}
                              nowMinutes={nowMinutes}
                              timeFormat={settings.timeFormat}
                              timeZone={timeZone}
                              streak={habitStreaks[it.habit.id]}
                            />
                          ))}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </div>
                </LayoutGroup>
              )}
            </section>
          </div>

          <div className="space-y-4 lg:col-span-4 lg:space-y-5">
            {widgets
              .filter((w) => w.visible)
              .map(({ widget }) => {
                switch (widget) {
                  case 'streak':
                    return <StreakCard key={widget} current={streak.current} best={streak.best} />;
                  case 'week':
                    return <WeekStrip key={widget} days={week} today={today} />;
                  case 'review':
                    return <WeeklyReviewCard key={widget} days={week} />;
                  case 'last7':
                    return <SevenDayStats key={widget} days={last7} />;
                  case 'goals':
                    return <GoalsWidget key={widget} />;
                  case 'focus':
                    return <FocusWidget key={widget} />;
                  case 'journal':
                    return <JournalWidget key={widget} />;
                  case 'quote':
                    return <QuoteCard key={widget} text={quote.text} author={quote.author} />;
                  default:
                    return null;
                }
              })}
          </div>
        </motion.div>
      )}
      <Celebration open={celebrate} onClose={closeCelebration} count={summary.scheduled} streak={streak.current} />
    </>
  );
}
