'use client';

import { motion } from 'framer-motion';
import { Ellipsis, Pencil, Trash2 } from 'lucide-react';
import { habitIcon } from '@/components/habits/habit-icons';
import { Menu } from '@/components/ui/Menu';
import { Switch } from '@/components/ui/Switch';
import { cn } from '@/lib/cn';
import { WEEKDAY_SHORT, formatShortDate, formatTime, orderedWeekdays } from '@/lib/date';
import { colorOf } from '@/lib/habits/meta';
import { describeSchedule, scheduleAt } from '@/lib/habits/schedule';
import { actions } from '@/lib/store/app-store';
import { toast } from '@/lib/store/toast-store';
import { ui } from '@/lib/store/ui-store';
import type { DateKey, Habit, Reminder } from '@/types';

export function ReminderCard({
  reminder,
  habit,
  timeFormat,
  weekStartsOn,
  today,
  next,
}: {
  reminder: Reminder;
  habit: Habit;
  timeFormat: '24h' | '12h';
  weekStartsOn: 0 | 1;
  today: DateKey;
  next: DateKey | null;
}) {
  const Icon = habitIcon(habit.icon);
  const color = colorOf(habit.color);
  const [time, suffix] = formatTime(reminder.time, timeFormat).split(' ');
  const inactive = !reminder.enabled || !!habit.archivedOn;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className={cn('glass flex items-center gap-4 rounded-[22px] p-4 transition-opacity sm:p-5', inactive && 'opacity-60')}
    >
      <div className="w-[76px] shrink-0">
        <p className="text-[28px] leading-none font-semibold tracking-[-0.04em] text-fg tabular-nums">
          {time}
          {suffix && <span className="ml-1 text-xs font-medium text-subtle">{suffix}</span>}
        </p>
        <p className="mt-1.5 text-[11px] text-subtle">
          {!reminder.enabled ? 'Выключено' : next ? (next === today ? 'Сегодня' : formatShortDate(next)) : '—'}
        </p>
      </div>
      <div className="min-w-0 flex-1 border-l border-line pl-4">
        <p className="flex items-center gap-2 text-[15px] font-medium text-fg">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg" style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, color }}>
            <Icon size={13} />
          </span>
          <span className="truncate">{habit.name}</span>
        </p>
        {reminder.days === 'schedule' ? (
          <p className="mt-1.5 text-xs text-subtle">По расписанию · {describeSchedule(scheduleAt(habit, today)).toLowerCase()}</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-1" aria-label="Дни недели">
            {orderedWeekdays(weekStartsOn).map((d) => {
              const on = (reminder.days as number[]).includes(d);
              return (
                <span
                  key={d}
                  className={cn(
                    'grid h-6 w-7 place-items-center rounded-md text-[10.5px] font-medium',
                    on ? 'bg-accent/15 text-accent' : 'text-subtle',
                  )}
                  aria-label={`${WEEKDAY_SHORT[d]}: ${on ? 'да' : 'нет'}`}
                >
                  {WEEKDAY_SHORT[d]}
                </span>
              );
            })}
          </div>
        )}
        {habit.archivedOn && <p className="mt-1 text-xs text-warning">Привычка в архиве — напоминание не сработает</p>}
      </div>
      <Switch
        checked={reminder.enabled}
        onChange={(v) => actions.toggleReminder(reminder.id, v)}
        label={`Напоминание ${habit.name} в ${reminder.time}`}
      />
      <Menu
        label={`Действия с напоминанием: ${habit.name}`}
        trigger={<Ellipsis size={18} />}
        items={[
          { label: 'Изменить', icon: <Pencil size={15} />, onSelect: () => ui.openReminderModal(reminder.id) },
          {
            label: 'Удалить',
            icon: <Trash2 size={15} />,
            tone: 'danger',
            onSelect: () => {
              const removed = actions.deleteReminder(reminder.id);
              if (removed)
                toast({ title: 'Напоминание удалено', action: { label: 'Отменить', onClick: () => actions.restoreReminder(removed) } });
            },
          },
        ]}
      />
    </motion.li>
  );
}
