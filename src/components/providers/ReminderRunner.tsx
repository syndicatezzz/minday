'use client';

import { useEffect } from 'react';
import { APP_CONFIG } from '@/config/app';
import { resolveTimeZone, zonedMinutes, zonedToday } from '@/lib/date';
import { dueReminders } from '@/lib/reminders/scheduler';
import { notificationChannel } from '@/lib/reminders/notifications';
import { actions, appStore } from '@/lib/store/app-store';
import { computeToday } from '@/lib/today';
import { toast } from '@/lib/store/toast-store';

const FIRED_KEY = `${APP_CONFIG.storagePrefix}:fired-reminders`;

function readFired(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(FIRED_KEY) || '{}') as Record<string, number>;
  } catch {
    return {};
  }
}

function writeFired(log: Record<string, number>) {
  const cutoff = Date.now() - 3 * 86_400_000;
  const pruned = Object.fromEntries(Object.entries(log).filter(([, ts]) => ts > cutoff));
  try {
    localStorage.setItem(FIRED_KEY, JSON.stringify(pruned));
  } catch {
    /* ignore */
  }
}

/**
 * Планировщик напоминаний, работающий, пока приложение открыто.
 * Время проверяется в часовом поясе пользователя; журнал срабатываний
 * в localStorage исключает повторы после перезагрузки и в соседних вкладках.
 */
export function ReminderRunner() {
  useEffect(() => {
    const check = async () => {
      const { data, status } = appStore.get();
      if (status !== 'ready' || !data.meta.onboarded) return;
      const now = new Date();
      const tz = resolveTimeZone(data.settings.timeZone);
      const fired = readFired();
      const due = dueReminders(data, zonedToday(now, tz), computeToday(data.settings), zonedMinutes(now, tz), fired);
      if (!due.length) return;
      for (const d of due) fired[d.fireKey] = Date.now();
      writeFired(fired);

      for (const { habit } of due) {
        const body = habit.description || 'Время для вашей привычки';
        let delivered = false;
        if (data.settings.notificationsEnabled) {
          delivered = await notificationChannel.show({ title: `${APP_CONFIG.name} · ${habit.name}`, body, tag: habit.id });
        }
        if (data.settings.inAppReminders || !delivered) {
          const date = computeToday(appStore.get().data.settings);
          toast({
            tone: 'reminder',
            title: habit.name,
            description: 'Напоминание о привычке',
            duration: 12_000,
            action: {
              label: 'Выполнено',
              onClick: () => {
                if (appStore.get().data.entries[`${habit.id}:${date}`]?.status !== 'completed') actions.toggleHabit(habit.id, date);
              },
            },
          });
        }
      }
    };

    void check();
    const id = window.setInterval(() => void check(), 15_000);
    const onVis = () => document.visibilityState === 'visible' && void check();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return null;
}
