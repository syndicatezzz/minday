'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Globe, Plus } from 'lucide-react';
import { AppLink } from '@/components/layout/AppLink';
import { useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { NotificationPermissionCard } from '@/components/reminders/NotificationPermissionCard';
import { ReminderCard } from '@/components/reminders/ReminderCard';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { fadeUp, stagger } from '@/lib/motion';
import { nextOccurrence } from '@/lib/reminders/scheduler';
import { useApp } from '@/lib/store/app-store';
import { useToday } from '@/lib/store/clock';
import { ui } from '@/lib/store/ui-store';

export default function RemindersPage() {
  const data = useApp((s) => s.data);
  const { today, nowMinutes, timeZone } = useToday();
  const { settings } = data;

  const list = useMemo(
    () =>
      Object.values(data.reminders)
        .filter((r) => data.habits[r.habitId])
        .sort((a, b) => a.time.localeCompare(b.time) || a.createdAt.localeCompare(b.createdAt))
        .map((r) => ({ r, habit: data.habits[r.habitId], next: nextOccurrence(r, data.habits[r.habitId], data, today, nowMinutes) })),
    [data, today, nowMinutes],
  );
  const enabledCount = list.filter((x) => x.r.enabled).length;
  const hasHabits = Object.values(data.habits).some((h) => !h.archivedOn);

  return (
    <>
      <PageHeader
        eyebrow="Напоминания"
        title="Вовремя и без суеты"
        description="Напоминания приходят по вашему часовому поясу и не беспокоят, если привычка уже выполнена."
        actions={
          <Button variant="primary" onClick={() => ui.openReminderModal()} disabled={!hasHabits}>
            <Plus size={17} /> Новое напоминание
          </Button>
        }
      />

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid gap-4 lg:grid-cols-12 lg:gap-5">
        <div className="space-y-3 lg:col-span-7 xl:col-span-8">
          <motion.div variants={fadeUp} className="flex items-baseline justify-between px-1">
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-fg">Расписание напоминаний</h2>
            <span className="text-xs text-subtle">
              {enabledCount} из {list.length} включено
            </span>
          </motion.div>
          {list.length === 0 ? (
            <EmptyState
              icon={<Bell size={26} />}
              title="Напоминаний пока нет"
              description={
                hasHabits
                  ? 'Добавьте напоминание к любой привычке — можно несколько в день и на разные дни недели.'
                  : 'Сначала создайте привычку, затем добавьте к ней напоминание.'
              }
              action={
                hasHabits ? (
                  <Button variant="primary" onClick={() => ui.openReminderModal()}>
                    <Plus size={16} /> Добавить напоминание
                  </Button>
                ) : (
                  <Button variant="primary" onClick={() => ui.openHabitModal()}>
                    <Plus size={16} /> Создать привычку
                  </Button>
                )
              }
            />
          ) : (
            <ul className="space-y-3">
              <AnimatePresence initial={false}>
                {list.map(({ r, habit, next }) => (
                  <ReminderCard
                    key={r.id}
                    reminder={r}
                    habit={habit}
                    next={next}
                    today={today}
                    timeFormat={settings.timeFormat}
                    weekStartsOn={settings.weekStartsOn}
                  />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>

        <motion.div variants={fadeUp} className="space-y-4 lg:col-span-5 xl:col-span-4">
          <NotificationPermissionCard />
          <div className="glass rounded-[24px] p-5">
            <p className="flex items-center gap-2 text-sm font-medium text-fg">
              <Globe size={15} className="text-accent" /> Часовой пояс
            </p>
            <p className="mt-1 text-[13px] text-muted">
              {timeZone}
              {settings.timeZone === 'auto' ? ' · автоматически' : ''}
            </p>
            <AppLink href="/settings" className="mt-2 inline-block text-xs font-medium text-accent hover:underline">
              Изменить в настройках
            </AppLink>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}
