'use client';

import { motion } from 'framer-motion';
import { Archive, ArchiveRestore, Check, Pause, Play, Trash2 } from 'lucide-react';
import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Chip, Stepper } from '@/components/ui/Chip';
import { Field, Select, TextArea, TextInput } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Segmented } from '@/components/ui/Segmented';
import { Switch } from '@/components/ui/Switch';
import { cn } from '@/lib/cn';
import { WEEKDAY_SHORT, isDateKey, isTimeString, orderedWeekdays } from '@/lib/date';
import { HABIT_CATEGORIES, HABIT_COLORS, colorOf } from '@/lib/habits/meta';
import { currentSchedule, isPausedNow, resolveDayItem } from '@/lib/habits/schedule';
import { actions, appStore, useApp } from '@/lib/store/app-store';
import { useToday } from '@/lib/store/clock';
import { toast } from '@/lib/store/toast-store';
import { useStore } from '@/lib/store/create-store';
import { ui, uiStore } from '@/lib/store/ui-store';
import type { Habit, HabitCategory, HabitColor, HabitInput, Schedule, Weekday } from '@/types';
import { HABIT_ICON_NAMES, habitIcon } from './habit-icons';
import { useDeleteHabit } from './useHabitActions';

type ScheduleKind = Schedule['type'];

interface FormState {
  name: string;
  description: string;
  icon: string;
  color: HabitColor;
  category: HabitCategory;
  kind: ScheduleKind;
  days: Weekday[];
  timesPerWeek: number;
  hasTime: boolean;
  time: string;
  reminderEnabled: boolean;
  reminderTime: string;
  startDate: string;
  targetPerDay: number;
}

function initialState(habit: Habit | null, reminderTime: string | null, reminderOn: boolean, today: string): FormState {
  if (!habit) {
    return {
      name: '',
      description: '',
      icon: 'Sparkles',
      color: 'violet',
      category: 'health',
      kind: 'daily',
      days: [1, 2, 3, 4, 5],
      timesPerWeek: 3,
      hasTime: true,
      time: '08:00',
      reminderEnabled: false,
      reminderTime: '08:00',
      startDate: today,
      targetPerDay: 1,
    };
  }
  const s = currentSchedule(habit, today);
  return {
    name: habit.name,
    description: habit.description,
    icon: habit.icon,
    color: habit.color,
    category: habit.category,
    kind: s.type,
    days: s.type === 'weekdays' ? s.days : [1, 2, 3, 4, 5],
    timesPerWeek: s.type === 'weekly' ? s.timesPerWeek : 3,
    hasTime: habit.time !== null,
    time: habit.time ?? '08:00',
    reminderEnabled: reminderOn,
    reminderTime: reminderTime ?? habit.time ?? '08:00',
    startDate: habit.startDate,
    targetPerDay: habit.targetPerDay,
  };
}

type Errors = Partial<Record<'name' | 'days' | 'time' | 'reminderTime' | 'startDate', string>>;

function validate(f: FormState): Errors {
  const e: Errors = {};
  const name = f.name.trim();
  if (!name) e.name = 'Введите название привычки';
  else if (name.length > 60) e.name = 'Не длиннее 60 символов';
  if (f.kind === 'weekdays' && f.days.length === 0) e.days = 'Выберите хотя бы один день';
  if (f.hasTime && !isTimeString(f.time)) e.time = 'Укажите время в формате ЧЧ:ММ';
  if (f.reminderEnabled && !isTimeString(f.reminderTime)) e.reminderTime = 'Укажите время напоминания';
  if (!isDateKey(f.startDate)) e.startDate = 'Укажите корректную дату';
  return e;
}

export function HabitModal() {
  const { open, habitId } = useStore(uiStore, (s) => s.habitModal);
  const habits = useApp((s) => s.data.habits);
  const reminders = useApp((s) => s.data.reminders);
  const weekStartsOn = useApp((s) => s.data.settings.weekStartsOn);
  const { today } = useToday();
  const habit = habitId ? habits[habitId] ?? null : null;
  const primary = useMemo(
    () =>
      habit
        ? Object.values(reminders)
            .filter((r) => r.habitId === habit.id)
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0]
        : undefined,
    [habit, reminders],
  );

  const [form, setForm] = useState<FormState>(() => initialState(null, null, false, today));
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const deleteHabit = useDeleteHabit();
  const uid = useId();

  useEffect(() => {
    if (!open) return;
    setForm(initialState(habit, primary?.time ?? null, !!primary?.enabled, today));
    setErrors({});
    setSubmitted(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, habitId]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (submitted) setErrors(validate(next));
      return next;
    });
  };

  const close = () => ui.closeHabitModal();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) {
      const first = Object.keys(errs)[0];
      document.getElementById(`${uid}-${first}`)?.focus();
      return;
    }
    const schedule: Schedule =
      form.kind === 'daily'
        ? { type: 'daily' }
        : form.kind === 'weekdays'
          ? { type: 'weekdays', days: [...form.days].sort() }
          : { type: 'weekly', timesPerWeek: form.timesPerWeek };
    const input: HabitInput = {
      name: form.name.trim(),
      description: form.description.trim(),
      icon: form.icon,
      color: form.color,
      category: form.category,
      schedule,
      time: form.hasTime ? form.time : null,
      targetPerDay: form.targetPerDay,
      startDate: form.startDate,
      reminderEnabled: form.reminderEnabled,
      reminderTime: form.reminderEnabled ? form.reminderTime : null,
    };
    if (habit) {
      actions.updateHabit(habit.id, input);
      toast({ title: 'Изменения сохранены', description: input.name });
    } else {
      const newId = actions.createHabit(input);
      const created = appStore.get().data.habits[newId];
      const onToday = created && resolveDayItem(created, appStore.get().data.entries, today, today, weekStartsOn) !== null;
      toast({
        title: 'Привычка создана',
        description: input.startDate > today ? 'Появится в день старта' : onToday ? 'Уже в списке на сегодня' : 'Появится в списке в запланированные дни',
      });
    }
    close();
  };

  const paused = habit ? isPausedNow(habit, today) : false;
  const ordered = orderedWeekdays(weekStartsOn);
  const accent = colorOf(form.color);
  const PreviewIcon = habitIcon(form.icon);
  const id = (k: string) => `${uid}-${k}`;

  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title={habit ? 'Редактировать привычку' : 'Новая привычка'}
      description={habit ? 'История выполнений сохранится при любых изменениях' : 'Маленькое действие, повторяемое регулярно'}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Отмена
          </Button>
          <Button variant="primary" type="submit" form={id('form')}>
            <Check size={16} /> {habit ? 'Сохранить' : 'Создать привычку'}
          </Button>
        </>
      }
    >
      <form id={id('form')} onSubmit={onSubmit} noValidate className="space-y-6">
        {/* Название + превью */}
        <div className="flex items-start gap-4">
          <motion.div
            key={form.icon + form.color}
            initial={{ scale: 0.85, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="mt-7 grid h-12 w-12 shrink-0 place-items-center rounded-2xl"
            style={{
              background: `color-mix(in oklab, ${accent} 18%, transparent)`,
              color: accent,
              boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${accent} 30%, transparent)`,
            }}
            aria-hidden
          >
            <PreviewIcon size={22} />
          </motion.div>
          <Field label="Название" htmlFor={id('name')} error={errors.name} className="flex-1">
            <TextInput
              id={id('name')}
              data-autofocus
              value={form.name}
              maxLength={60}
              autoComplete="off"
              placeholder="Например, 10 минут чтения"
              invalid={!!errors.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </Field>
        </div>

        <Field label="Описание" htmlFor={id('description')} hint="Необязательно · до 200 символов">
          <TextArea
            id={id('description')}
            value={form.description}
            maxLength={200}
            rows={2}
            placeholder="Зачем это нужно и как именно выполнять"
            onChange={(e) => set('description', e.target.value)}
          />
        </Field>

        {/* Иконка */}
        <fieldset className="space-y-2">
          <legend className="mb-2 text-[13px] font-medium text-muted">Иконка</legend>
          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-10" role="radiogroup" aria-label="Иконка привычки">
            {HABIT_ICON_NAMES.map((name) => {
              const Icon = habitIcon(name);
              const active = form.icon === name;
              return (
                <button
                  key={name}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={name}
                  onClick={() => set('icon', name)}
                  className={cn(
                    'grid aspect-square place-items-center rounded-xl border transition-all duration-200 active:scale-90',
                    active ? 'border-transparent' : 'border-line bg-fill text-muted hover:bg-fill-strong hover:text-fg',
                  )}
                  style={active ? { background: `color-mix(in oklab, ${accent} 20%, transparent)`, color: accent, boxShadow: `inset 0 0 0 1.5px ${accent}` } : undefined}
                >
                  <Icon size={18} />
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Категория" htmlFor={id('category')}>
            <Select id={id('category')} value={form.category} onChange={(e) => set('category', e.target.value as HabitCategory)}>
              {HABIT_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <fieldset>
            <legend className="mb-2 text-[13px] font-medium text-muted">Цвет</legend>
            <div className="flex h-12 flex-wrap items-center gap-2" role="radiogroup" aria-label="Цвет привычки">
              {HABIT_COLORS.map((c) => {
                const active = form.color === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={c.label}
                    title={c.label}
                    onClick={() => set('color', c.id)}
                    className="grid h-8 w-8 place-items-center rounded-full transition-transform duration-200 hover:scale-110 active:scale-95"
                    style={{
                      background: c.hex,
                      boxShadow: active ? `0 0 0 2px var(--bg-elevated), 0 0 0 4px ${c.hex}` : 'inset 0 0 0 1px rgba(255,255,255,0.25)',
                    }}
                  >
                    {active && <Check size={14} className="text-white" strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>

        {/* Расписание */}
        <fieldset className="space-y-3">
          <legend className="mb-2 text-[13px] font-medium text-muted">Расписание</legend>
          <Segmented<ScheduleKind>
            ariaLabel="Тип расписания"
            stretch
            value={form.kind}
            onChange={(v) => set('kind', v)}
            options={[
              { value: 'daily', label: 'Каждый день' },
              { value: 'weekdays', label: 'Дни недели' },
              { value: 'weekly', label: 'N раз в неделю' },
            ]}
          />
          {form.kind === 'weekdays' && (
            <div>
              <div className="flex flex-wrap gap-1.5" id={id('days')} tabIndex={-1}>
                {ordered.map((d) => (
                  <Chip
                    key={d}
                    active={form.days.includes(d)}
                    onClick={() => set('days', form.days.includes(d) ? form.days.filter((x) => x !== d) : [...form.days, d])}
                    className="w-11 justify-center px-0"
                  >
                    {WEEKDAY_SHORT[d]}
                  </Chip>
                ))}
              </div>
              {errors.days && (
                <p role="alert" className="mt-2 text-xs text-danger">
                  {errors.days}
                </p>
              )}
            </div>
          )}
          {form.kind === 'weekly' && (
            <div className="flex flex-wrap items-center gap-3">
              <Stepper label="Раз в неделю" value={form.timesPerWeek} min={1} max={6} onChange={(v) => set('timesPerWeek', v)} suffix="р/нед" />
              <p className="text-xs text-subtle">В любые дни — серия считается по неделям</p>
            </div>
          )}
          {habit && <p className="text-xs text-subtle">Новое расписание начнёт действовать с сегодняшнего дня — прошлые дни не пересчитываются.</p>}
        </fieldset>

        {/* Время и напоминание */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="glass-subtle space-y-3 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <label htmlFor={id('time')} className="text-sm font-medium text-fg">
                Время привычки
              </label>
              <Switch size="sm" checked={form.hasTime} onChange={(v) => set('hasTime', v)} label="Указать время привычки" />
            </div>
            {form.hasTime ? (
              <TextInput id={id('time')} type="time" value={form.time} invalid={!!errors.time} onChange={(e) => set('time', e.target.value)} />
            ) : (
              <p className="flex h-12 items-center text-sm text-subtle">В любое время дня</p>
            )}
            {errors.time && <p className="text-xs text-danger">{errors.time}</p>}
          </div>
          <div className="glass-subtle space-y-3 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <label htmlFor={id('reminderTime')} className="text-sm font-medium text-fg">
                Напоминание
              </label>
              <Switch
                size="sm"
                checked={form.reminderEnabled}
                onChange={(v) => {
                  set('reminderEnabled', v);
                  if (v && form.hasTime) set('reminderTime', form.time);
                }}
                label="Включить напоминание"
              />
            </div>
            {form.reminderEnabled ? (
              <TextInput
                id={id('reminderTime')}
                type="time"
                value={form.reminderTime}
                invalid={!!errors.reminderTime}
                onChange={(e) => set('reminderTime', e.target.value)}
              />
            ) : (
              <p className="flex h-12 items-center text-sm text-subtle">Выключено</p>
            )}
            {errors.reminderTime && <p className="text-xs text-danger">{errors.reminderTime}</p>}
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Дата начала" htmlFor={id('startDate')} error={errors.startDate}>
            <TextInput id={id('startDate')} type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
          </Field>
          <Field label="Повторений за день" hint={form.targetPerDay > 1 ? 'Отмечайте каждое повторение отдельно' : 'Одна отметка в день'}>
            <Stepper label="Повторений за день" value={form.targetPerDay} min={1} max={20} onChange={(v) => set('targetPerDay', v)} />
          </Field>
        </div>

        {habit && (
          <div className="space-y-3 border-t border-line pt-6">
            <p className="text-[13px] font-medium text-muted">Управление</p>
            <div className="flex flex-wrap gap-2">
              {!habit.archivedOn &&
                (paused ? (
                  <Button
                    variant="subtle"
                    size="sm"
                    onClick={() => {
                      actions.resumeHabit(habit.id);
                      toast({ title: 'Привычка снова активна' });
                    }}
                  >
                    <Play size={14} /> Возобновить
                  </Button>
                ) : (
                  <Button
                    variant="subtle"
                    size="sm"
                    onClick={() => {
                      actions.pauseHabit(habit.id);
                      toast({ title: 'Привычка на паузе', description: 'Дни паузы не считаются пропусками' });
                    }}
                  >
                    <Pause size={14} /> Пауза
                  </Button>
                ))}
              {habit.archivedOn ? (
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={() => {
                    actions.unarchiveHabit(habit.id);
                    toast({ title: 'Привычка восстановлена из архива' });
                  }}
                >
                  <ArchiveRestore size={14} /> Вернуть из архива
                </Button>
              ) : (
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={() => {
                    actions.archiveHabit(habit.id);
                    toast({ title: 'Перемещено в архив', description: 'История сохранена' });
                    close();
                  }}
                >
                  <Archive size={14} /> В архив
                </Button>
              )}
              <Button
                variant="danger"
                size="sm"
                onClick={async () => {
                  const done = await deleteHabit(habit);
                  if (done) close();
                }}
              >
                <Trash2 size={14} /> Удалить
              </Button>
            </div>
            {paused && <p className="text-xs text-warning">Сейчас на паузе — привычка не появляется в списке дня.</p>}
          </div>
        )}
      </form>
    </Modal>
  );
}
