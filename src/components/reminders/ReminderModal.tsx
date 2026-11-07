'use client';

import { Check } from 'lucide-react';
import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Field, Select, TextInput } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Segmented } from '@/components/ui/Segmented';
import { Switch } from '@/components/ui/Switch';
import { WEEKDAY_SHORT, isTimeString, orderedWeekdays } from '@/lib/date';
import { describeSchedule, scheduleAt } from '@/lib/habits/schedule';
import { actions, useApp } from '@/lib/store/app-store';
import { useToday } from '@/lib/store/clock';
import { useStore } from '@/lib/store/create-store';
import { toast } from '@/lib/store/toast-store';
import { ui, uiStore } from '@/lib/store/ui-store';
import type { Weekday } from '@/types';

export function ReminderModal() {
  const { open, reminderId, habitId: presetHabit } = useStore(uiStore, (s) => s.reminderModal);
  const habitsMap = useApp((s) => s.data.habits);
  const reminders = useApp((s) => s.data.reminders);
  const weekStartsOn = useApp((s) => s.data.settings.weekStartsOn);
  const { today } = useToday();
  const habits = useMemo(
    () => Object.values(habitsMap).filter((h) => !h.archivedOn).sort((a, b) => a.order - b.order),
    [habitsMap],
  );
  const existing = reminderId ? reminders[reminderId] : undefined;

  const [habitId, setHabitId] = useState('');
  const [time, setTime] = useState('09:00');
  const [mode, setMode] = useState<'schedule' | 'custom'>('schedule');
  const [days, setDays] = useState<Weekday[]>([1, 2, 3, 4, 5]);
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const uid = useId();

  useEffect(() => {
    if (!open) return;
    const h = existing?.habitId ?? presetHabit ?? habits[0]?.id ?? '';
    setHabitId(h);
    setTime(existing?.time ?? habitsMap[h]?.time ?? '09:00');
    setMode(existing && existing.days !== 'schedule' ? 'custom' : 'schedule');
    setDays(existing && existing.days !== 'schedule' ? existing.days : [1, 2, 3, 4, 5]);
    setEnabled(existing?.enabled ?? true);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reminderId]);

  const close = () => ui.closeReminderModal();
  const selectedHabit = habitsMap[habitId];

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedHabit) return setError('Выберите привычку');
    if (!isTimeString(time)) return setError('Укажите время');
    if (mode === 'custom' && days.length === 0) return setError('Выберите хотя бы один день');
    actions.saveReminder({ id: existing?.id, habitId, time, days: mode === 'schedule' ? 'schedule' : [...days].sort(), enabled });
    toast({ title: existing ? 'Напоминание обновлено' : 'Напоминание создано', description: `${selectedHabit.name} · ${time}` });
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      size="sm"
      title={existing ? 'Изменить напоминание' : 'Новое напоминание'}
      description="Срабатывает в вашем часовом поясе, пока приложение открыто"
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Отмена
          </Button>
          <Button variant="primary" type="submit" form={`${uid}-form`} disabled={!habits.length}>
            <Check size={16} /> Сохранить
          </Button>
        </>
      }
    >
      {habits.length === 0 ? (
        <p className="text-sm text-muted">Сначала создайте привычку — напоминание привязывается к ней.</p>
      ) : (
        <form id={`${uid}-form`} onSubmit={onSubmit} noValidate className="space-y-5">
          <Field label="Привычка" htmlFor={`${uid}-habit`}>
            <Select id={`${uid}-habit`} value={habitId} onChange={(e) => setHabitId(e.target.value)} data-autofocus>
              {habits.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Время" htmlFor={`${uid}-time`}>
            <TextInput id={`${uid}-time`} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
          <fieldset className="space-y-3">
            <legend className="mb-2 text-[13px] font-medium text-muted">Дни</legend>
            <Segmented
              ariaLabel="Дни напоминания"
              stretch
              value={mode}
              onChange={setMode}
              options={[
                { value: 'schedule', label: 'По расписанию' },
                { value: 'custom', label: 'Выбрать дни' },
              ]}
            />
            {mode === 'schedule' ? (
              <p className="text-xs text-subtle">
                {selectedHabit ? `Как у привычки: ${describeSchedule(scheduleAt(selectedHabit, today)).toLowerCase()}` : ''}
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {orderedWeekdays(weekStartsOn).map((d) => (
                  <Chip
                    key={d}
                    active={days.includes(d)}
                    className="w-11 justify-center px-0"
                    onClick={() => setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d])}
                  >
                    {WEEKDAY_SHORT[d]}
                  </Chip>
                ))}
              </div>
            )}
          </fieldset>
          <div className="glass-subtle flex items-center justify-between rounded-2xl px-4 py-3">
            <span className="text-sm text-fg">Напоминание включено</span>
            <Switch checked={enabled} onChange={setEnabled} label="Напоминание включено" />
          </div>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
        </form>
      )}
    </Modal>
  );
}
