'use client';

import { motion } from 'framer-motion';
import { CalendarDays } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { DayDetails } from '@/components/calendar/DayDetails';
import { Heatmap } from '@/components/calendar/Heatmap';
import { CalendarLegend, MonthCalendar, monthGridRange } from '@/components/calendar/MonthCalendar';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { CardHeader, GlassCard } from '@/components/ui/GlassCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Field';
import { Hint } from '@/components/ui/Hint';
import { addDays, isDateKey, rangeKeys, startOfMonth, startOfWeek } from '@/lib/date';
import { CATEGORY_LABEL, HABIT_CATEGORIES } from '@/lib/habits/meta';
import { type DaySummary, getDayItems, summarizeDay } from '@/lib/habits/schedule';
import { stagger } from '@/lib/motion';
import { useApp } from '@/lib/store/app-store';
import { useToday } from '@/lib/store/clock';
import { ui } from '@/lib/store/ui-store';
import type { DateKey, Habit } from '@/types';

const HEATMAP_WEEKS = 26;

export default function CalendarPage() {
  const habitsMap = useApp((s) => s.data.habits);
  const entries = useApp((s) => s.data.entries);
  const settings = useApp((s) => s.data.settings);
  const { today, timeZone } = useToday();
  const ws = settings.weekStartsOn;

  const [selected, setSelected] = useState<DateKey>(today);
  const [month, setMonth] = useState<DateKey>(startOfMonth(today));
  const [direction, setDirection] = useState(0);
  const [filter, setFilter] = useState('all');

  // Поддержка ссылок вида /calendar?date=YYYY-MM-DD
  useEffect(() => {
    const d = new URLSearchParams(window.location.search).get('date');
    if (d && isDateKey(d)) {
      setSelected(d);
      setMonth(startOfMonth(d));
    }
  }, []);

  const allHabits = useMemo(() => Object.values(habitsMap).sort((a, b) => a.order - b.order), [habitsMap]);
  const habits: Habit[] = useMemo(() => {
    if (filter === 'all') return allHabits;
    if (filter.startsWith('habit:')) return allHabits.filter((h) => h.id === filter.slice(6));
    if (filter.startsWith('cat:')) return allHabits.filter((h) => h.category === filter.slice(4));
    return allHabits;
  }, [allHabits, filter]);

  // Итоги дней для видимого месяца и тепловой карты — одним проходом
  const summaries = useMemo(() => {
    const map: Record<DateKey, DaySummary> = {};
    const grid = monthGridRange(month, ws);
    const heatStart = addDays(startOfWeek(today, ws), -(HEATMAP_WEEKS - 1) * 7);
    const heatEnd = addDays(startOfWeek(today, ws), 6);
    const ranges: [DateKey, DateKey][] = [
      [grid.start, grid.end],
      [heatStart, heatEnd],
    ];
    for (const [from, to] of ranges) {
      for (const d of rangeKeys(from, to)) {
        if (!map[d]) map[d] = summarizeDay(getDayItems(habits, entries, d, today, ws), d, today);
      }
    }
    if (!map[selected]) map[selected] = summarizeDay(getDayItems(habits, entries, selected, today, ws), selected, today);
    return map;
  }, [habits, entries, month, today, ws, selected]);

  const selectedItems = useMemo(() => getDayItems(habits, entries, selected, today, ws), [habits, entries, selected, today, ws]);
  const usedCategories = new Set(allHabits.map((h) => h.category));

  const changeMonth = (m: DateKey, dir: number) => {
    setDirection(dir);
    setMonth(m);
  };

  const selectFromHeatmap = (d: DateKey) => {
    setSelected(d);
    const m = startOfMonth(d);
    if (m !== month) changeMonth(m, m > month ? 1 : -1);
    document.getElementById('day-details')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  if (allHabits.length === 0) {
    return (
      <>
        <PageHeader eyebrow="Календарь" title="История по дням" />
        <EmptyState
          icon={<CalendarDays size={28} />}
          title="Календарь пока пуст"
          description="Здесь появится история выполнений и пропусков, как только вы добавите привычки."
          action={
            <Button variant="primary" onClick={() => ui.openHabitModal()}>
              Добавить привычку
            </Button>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Календарь"
        title="История по дням"
        description="Выберите день, чтобы увидеть подробности, или исправьте отметку задним числом."
        actions={
          <div className="w-full sm:w-64">
            <label htmlFor="cal-filter" className="sr-only">
              Фильтр календаря
            </label>
            <Select id="cal-filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">Все привычки</option>
              <optgroup label="Категории">
                {HABIT_CATEGORIES.filter((c) => usedCategories.has(c.id)).map((c) => (
                  <option key={c.id} value={`cat:${c.id}`}>
                    {CATEGORY_LABEL[c.id]}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Привычки">
                {allHabits.map((h) => (
                  <option key={h.id} value={`habit:${h.id}`}>
                    {h.name}
                    {h.archivedOn ? ' (архив)' : ''}
                  </option>
                ))}
              </optgroup>
            </Select>
          </div>
        }
      />

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid gap-4 lg:grid-cols-12 lg:gap-5">
        <GlassCard className="p-4 sm:p-6 lg:col-span-7 xl:col-span-8">
          <MonthCalendar
            month={month}
            direction={direction}
            onMonthChange={changeMonth}
            selected={selected}
            onSelect={setSelected}
            today={today}
            weekStartsOn={ws}
            summaries={summaries}
          />
          <div className="mt-5 border-t border-line pt-4">
            <CalendarLegend />
          </div>
        </GlassCard>

        <GlassCard id="day-details" className="p-5 sm:p-6 lg:col-span-5 xl:col-span-4">
          <DayDetails
            date={selected}
            items={selectedItems}
            summary={summaries[selected]}
            today={today}
            timeFormat={settings.timeFormat}
            timeZone={timeZone}
          />
        </GlassCard>

        <GlassCard className="p-5 sm:p-6 lg:col-span-12">
          <CardHeader
            title="Карта активности"
            subtitle={`Последние ${HEATMAP_WEEKS} недель · ${filter === 'all' ? 'все привычки' : 'с учётом фильтра'}`}
            className="mb-5"
          />
          <Heatmap
            summaries={summaries}
            weeks={HEATMAP_WEEKS}
            today={today}
            weekStartsOn={ws}
            selected={selected}
            onSelect={selectFromHeatmap}
          />
          <Hint id="calendar-heatmap" className="mt-4">
            Каждая клетка — день. Красный — всё пропущено, оттенки фиолетового — часть выполнена, зелёный — идеальный день.
            Нажмите на клетку, чтобы открыть подробности.
          </Hint>
        </GlassCard>
      </motion.div>
    </>
  );
}
