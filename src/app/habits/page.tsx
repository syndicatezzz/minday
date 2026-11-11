'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Archive, ArchiveRestore, Bell, Check, Clock, GripVertical, ListChecks, Route, Ellipsis, Flame, Pause, Pencil, Play, Plus, Search, Sprout, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { habitIcon } from '@/components/habits/habit-icons';
import { ReorderList } from '@/components/habits/ReorderList';
import { RoutinesPanel } from '@/components/routines/RoutinesPanel';
import { useDeleteHabit } from '@/components/habits/useHabitActions';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge, Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select, inputClass } from '@/components/ui/Field';
import { Hint } from '@/components/ui/Hint';
import { Menu } from '@/components/ui/Menu';
import { ProgressBar } from '@/components/ui/Progress';
import { Segmented } from '@/components/ui/Segmented';
import { cn } from '@/lib/cn';
import { formatLongDate, formatTime } from '@/lib/date';
import { habitRate } from '@/lib/habits/analytics';
import { CATEGORY_LABEL, HABIT_CATEGORIES, colorOf } from '@/lib/habits/meta';
import { currentSchedule, describeSchedule, isPausedNow } from '@/lib/habits/schedule';
import { habitStreak } from '@/lib/habits/streak';
import { describeTarget } from '@/lib/habits/values';
import { stagger } from '@/lib/motion';
import { actions, useApp } from '@/lib/store/app-store';
import { useToday } from '@/lib/store/clock';
import { toast } from '@/lib/store/toast-store';
import { ui } from '@/lib/store/ui-store';
import type { Habit, HabitCategory } from '@/types';


type SortKey = 'order' | 'name' | 'rate' | 'streak' | 'created';
type Tab = 'active' | 'archived';

interface Row {
  habit: Habit;
  rate: number | null;
  streak: { current: number; best: number; unit: 'day' | 'week' };
  paused: boolean;
  reminderTime: string | null;
}

export default function HabitsPage() {
  const habitsMap = useApp((s) => s.data.habits);
  const entries = useApp((s) => s.data.entries);
  const reminders = useApp((s) => s.data.reminders);
  const settings = useApp((s) => s.data.settings);
  const { today } = useToday();
  const ws = settings.weekStartsOn;

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<HabitCategory | 'all'>('all');
  const [sort, setSort] = useState<SortKey>('order');
  const [tab, setTab] = useState<Tab>('active');
  const [reorder, setReorder] = useState(false);
  const [view, setView] = useState<'habits' | 'routines'>('habits');
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('tab') === 'routines') setView('routines');
  }, []);

  const rows: Row[] = useMemo(
    () =>
      Object.values(habitsMap).map((habit) => {
        const r = habitRate(habit, entries, habit.startDate, today, today, ws);
        const rem = Object.values(reminders)
          .filter((x) => x.habitId === habit.id && x.enabled)
          .sort((a, b) => a.time.localeCompare(b.time))[0];
        return {
          habit,
          rate: r.rate,
          streak: habitStreak(habit, entries, today, ws),
          paused: isPausedNow(habit, today),
          reminderTime: rem?.time ?? null,
        };
      }),
    [habitsMap, entries, reminders, today, ws],
  );

  const counts = useMemo(
    () => ({ active: rows.filter((r) => !r.habit.archivedOn).length, archived: rows.filter((r) => r.habit.archivedOn).length }),
    [rows],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter(
      (r) =>
        (tab === 'archived' ? !!r.habit.archivedOn : !r.habit.archivedOn) &&
        (category === 'all' || r.habit.category === category) &&
        (!q || r.habit.name.toLowerCase().includes(q) || r.habit.description.toLowerCase().includes(q)),
    );
    const cmp: Record<SortKey, (a: Row, b: Row) => number> = {
      order: (a, b) => a.habit.order - b.habit.order,
      name: (a, b) => a.habit.name.localeCompare(b.habit.name, 'ru'),
      rate: (a, b) => (b.rate ?? -1) - (a.rate ?? -1),
      streak: (a, b) => b.streak.current - a.streak.current,
      created: (a, b) => b.habit.createdAt.localeCompare(a.habit.createdAt),
    };
    return list.sort(cmp[sort]);
  }, [rows, tab, category, query, sort]);

  const activeOrdered = useMemo(
    () => rows.filter((r) => !r.habit.archivedOn).map((r) => r.habit).sort((a, b) => a.order - b.order),
    [rows],
  );
  const usedCategories = useMemo(() => new Set(rows.map((r) => r.habit.category)), [rows]);
  const filtersActive = query.trim() !== '' || category !== 'all';

  return (
    <>
      <PageHeader
        eyebrow="Мои привычки"
        title={view === 'routines' ? 'Рутины — привычки цепочкой' : 'Всё, что вы выстраиваете'}
        description="Управляйте расписанием, напоминаниями и архивом. История выполнений сохраняется при любых изменениях."
        actions={
          <Button variant="primary" onClick={() => ui.openHabitModal()}>
            <Plus size={17} /> Добавить привычку
          </Button>
        }
      />

      <div className="mb-5">
        <Segmented<'habits' | 'routines'>
          ariaLabel="Раздел"
          value={view}
          onChange={setView}
          options={[
            { value: 'habits', label: 'Привычки', icon: <ListChecks size={14} /> },
            { value: 'routines', label: 'Рутины', icon: <Route size={14} /> },
          ]}
        />
      </div>

      {view === 'routines' ? (
        <RoutinesPanel />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Sprout size={28} />}
          title="Список пока пуст"
          description="Создайте первую привычку — её можно будет изменить, поставить на паузу или отправить в архив."
          action={
            <Button variant="primary" size="lg" onClick={() => ui.openHabitModal()}>
              <Plus size={17} /> Добавить привычку
            </Button>
          }
        />
      ) : (
        <>
          <div className="glass mb-5 space-y-4 rounded-[24px] p-4 sm:p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search size={17} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-subtle" />
                <label htmlFor="habit-search" className="sr-only">
                  Поиск по названию
                </label>
                <input
                  id="habit-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Поиск по названию"
                  className={cn(inputClass, 'pl-11')}
                />
                {query && (
                  <button
                    type="button"
                    aria-label="Очистить поиск"
                    onClick={() => setQuery('')}
                    className="absolute top-1/2 right-2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-subtle hover:bg-fill hover:text-fg"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <Segmented<Tab>
                  ariaLabel="Активные или архив"
                  value={tab}
                  onChange={setTab}
                  options={[
                    { value: 'active', label: `Активные · ${counts.active}` },
                    { value: 'archived', label: `Архив · ${counts.archived}` },
                  ]}
                />
                {tab === 'active' && counts.active > 1 && (
                  <Button
                    variant={reorder ? 'primary' : 'subtle'}
                    className="h-11 shrink-0"
                    aria-pressed={reorder}
                    onClick={() => {
                      setReorder((r) => !r);
                      setSort('order');
                      setQuery('');
                      setCategory('all');
                    }}
                  >
                    {reorder ? <Check size={16} /> : <GripVertical size={16} />}
                    <span className="hidden sm:inline">{reorder ? 'Готово' : 'Порядок'}</span>
                  </Button>
                )}
                <div className={cn('w-44 shrink-0', reorder && 'pointer-events-none opacity-40')}>
                  <label htmlFor="habit-sort" className="sr-only">
                    Сортировка
                  </label>
                  <Select id="habit-sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="h-11">
                    <option value="order">По порядку</option>
                    <option value="name">По названию</option>
                    <option value="rate">По проценту</option>
                    <option value="streak">По серии</option>
                    <option value="created">Сначала новые</option>
                  </Select>
                </div>
              </div>
            </div>
            <div className="scrollbar-none -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5" role="group" aria-label="Фильтр по категориям">
              <Chip active={category === 'all'} onClick={() => setCategory('all')}>
                Все категории
              </Chip>
              {HABIT_CATEGORIES.filter((c) => usedCategories.has(c.id)).map((c) => (
                <Chip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>
                  {c.label}
                </Chip>
              ))}
            </div>
          </div>

          <Hint id="habits-manage" className="mb-4">
            Нажмите на карточку, чтобы изменить привычку. Пауза сохраняет серию: дни паузы не считаются пропусками.
          </Hint>

          {reorder && tab === 'active' ? (
            <>
              <p className="mb-3 px-1 text-[13px] text-subtle">Перетащите привычки за ручку или используйте стрелки — порядок сохранится сразу.</p>
              <ReorderList habits={activeOrdered} />
            </>
          ) : visible.length === 0 ? (
            <EmptyState
              icon={tab === 'archived' ? <Archive size={26} /> : <Search size={26} />}
              title={tab === 'archived' && !filtersActive ? 'Архив пуст' : 'Ничего не найдено'}
              description={
                tab === 'archived' && !filtersActive
                  ? 'Архивированные привычки сохраняют всю историю и не появляются в списке дня.'
                  : 'Попробуйте изменить запрос или фильтр.'
              }
              action={
                filtersActive ? (
                  <Button
                    variant="subtle"
                    onClick={() => {
                      setQuery('');
                      setCategory('all');
                    }}
                  >
                    Сбросить фильтры
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <motion.ul variants={stagger} initial="hidden" animate="show" className="grid gap-3 xl:grid-cols-2">
              <AnimatePresence initial={false}>
                {visible.map((row) => (
                  <HabitRow key={row.habit.id} row={row} today={today} timeFormat={settings.timeFormat} />
                ))}
              </AnimatePresence>
            </motion.ul>
          )}
        </>
      )}
    </>
  );
}

function HabitRow({ row, today, timeFormat }: { row: Row; today: string; timeFormat: '24h' | '12h' }) {
  const { habit, rate, streak, paused, reminderTime } = row;
  const color = colorOf(habit.color);
  const Icon = habitIcon(habit.icon);
  const deleteHabit = useDeleteHabit();
  const notStarted = habit.startDate > today;
  const status = habit.archivedOn
    ? { text: 'В архиве', tone: 'default' as const }
    : paused
      ? { text: 'На паузе', tone: 'warning' as const }
      : notStarted
        ? { text: `Старт ${formatLongDate(habit.startDate)}`, tone: 'accent' as const }
        : { text: 'Активна', tone: 'success' as const };

  return (
    <motion.li
      layout
      variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
      className="list-none"
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => ui.openHabitModal(habit.id)}
        onKeyDown={(e) => {
          if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            ui.openHabitModal(habit.id);
          }
        }}
        aria-label={`Изменить привычку «${habit.name}»`}
        className={cn(
          'glass glass-hover spotlight lift group block h-full rounded-[24px] p-4 text-left sm:p-5',
          (habit.archivedOn || paused) && 'opacity-80',
        )}
      >
        <div className="flex items-start gap-3.5">
          <span
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl"
            style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, color, boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${color} 26%, transparent)` }}
          >
            <Icon size={21} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-fg">{habit.name}</h2>
            </div>
            <p className="mt-0.5 line-clamp-1 text-[13px] text-subtle">{habit.description || 'Без описания'}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge tone={status.tone}>{status.text}</Badge>
              <Badge>{CATEGORY_LABEL[habit.category]}</Badge>
              <Badge>{describeSchedule(currentSchedule(habit, today))}</Badge>
              {habit.kind !== 'check' && <Badge tone="accent">{describeTarget(habit)}</Badge>}
            </div>
          </div>
          <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <Menu
              label={`Действия: ${habit.name}`}
              trigger={<Ellipsis size={18} />}
              items={[
                { label: 'Изменить', icon: <Pencil size={15} />, onSelect: () => ui.openHabitModal(habit.id) },
                {
                  label: 'Поставить на паузу',
                  icon: <Pause size={15} />,
                  hidden: paused || !!habit.archivedOn,
                  onSelect: () => {
                    actions.pauseHabit(habit.id);
                    toast({ title: 'Привычка на паузе', description: 'Дни паузы не считаются пропусками' });
                  },
                },
                {
                  label: 'Возобновить',
                  icon: <Play size={15} />,
                  hidden: !paused || !!habit.archivedOn,
                  onSelect: () => {
                    actions.resumeHabit(habit.id);
                    toast({ title: 'Привычка снова активна' });
                  },
                },
                {
                  label: 'В архив',
                  icon: <Archive size={15} />,
                  hidden: !!habit.archivedOn,
                  onSelect: () => {
                    actions.archiveHabit(habit.id);
                    toast({ title: 'Перемещено в архив', description: 'История сохранена', action: { label: 'Отменить', onClick: () => actions.unarchiveHabit(habit.id) } });
                  },
                },
                {
                  label: 'Вернуть из архива',
                  icon: <ArchiveRestore size={15} />,
                  hidden: !habit.archivedOn,
                  onSelect: () => {
                    actions.unarchiveHabit(habit.id);
                    toast({ title: 'Привычка снова активна' });
                  },
                },
                { label: 'Удалить', icon: <Trash2 size={15} />, tone: 'danger', onSelect: () => void deleteHabit(habit) },
              ]}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4 text-[12px]">
          <div>
            <p className="text-subtle">Выполнение</p>
            <p className="mt-0.5 text-[15px] font-semibold text-fg tabular-nums">{rate === null ? '—' : `${Math.round(rate * 100)}%`}</p>
          </div>
          <div>
            <p className="text-subtle">Серия</p>
            <p className="mt-0.5 inline-flex items-center gap-1 text-[15px] font-semibold text-fg tabular-nums">
              <Flame size={13} className={streak.current ? 'text-warning' : 'text-subtle'} />
              {streak.current}
              <span className="text-[11px] font-normal text-subtle">{streak.unit === 'week' ? 'нед.' : 'дн.'}</span>
            </p>
          </div>
          <div>
            <p className="text-subtle">Время</p>
            <p className="mt-0.5 flex flex-col text-[13px] font-medium text-fg">
              <span className="inline-flex items-center gap-1">
                <Clock size={12} className="text-subtle" /> {habit.time ? formatTime(habit.time, timeFormat) : 'Любое'}
              </span>
              {reminderTime && (
                <span className="inline-flex items-center gap-1 text-[11px] font-normal text-subtle">
                  <Bell size={11} /> {formatTime(reminderTime, timeFormat)}
                </span>
              )}
            </p>
          </div>
        </div>
        <ProgressBar value={rate ?? 0} color={color} className="mt-3" height={4} label={`Процент выполнения: ${habit.name}`} />
      </div>
    </motion.li>
  );
}
