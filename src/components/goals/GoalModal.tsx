'use client';

import { Check } from 'lucide-react';
import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import { habitIcon } from '@/components/habits/habit-icons';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Field, TextArea, TextInput } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Switch } from '@/components/ui/Switch';
import { cn } from '@/lib/cn';
import { addDays, isDateKey } from '@/lib/date';
import { HABIT_COLORS, colorOf } from '@/lib/habits/meta';
import { actions, useApp } from '@/lib/store/app-store';
import { useToday } from '@/lib/store/clock';
import { toast } from '@/lib/store/toast-store';
import type { HabitColor } from '@/types';

const ICONS = ['Target', 'Mountain', 'BookOpen', 'Dumbbell', 'Heart', 'Brain', 'Wallet', 'Languages', 'Sprout', 'Flame'];

export function GoalModal({ open, goalId, onClose }: { open: boolean; goalId: string | null; onClose: () => void }) {
  const goals = useApp((s) => s.data.goals);
  const habitsMap = useApp((s) => s.data.habits);
  const { today } = useToday();
  const habits = useMemo(() => Object.values(habitsMap).filter((h) => !h.archivedOn).sort((a, b) => a.order - b.order), [habitsMap]);
  const existing = goalId ? goals[goalId] : undefined;
  const uid = useId();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Target');
  const [color, setColor] = useState<HabitColor>('violet');
  const [hasDate, setHasDate] = useState(true);
  const [targetDate, setTargetDate] = useState(addDays(today, 90));
  const [ids, setIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(existing?.name ?? '');
    setDescription(existing?.description ?? '');
    setIcon(existing?.icon ?? 'Target');
    setColor(existing?.color ?? 'violet');
    setHasDate(existing ? existing.targetDate !== null : true);
    setTargetDate(existing?.targetDate ?? addDays(today, 90));
    setIds(existing?.habitIds ?? []);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, goalId]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Назовите цель');
    if (hasDate && (!isDateKey(targetDate) || targetDate <= (existing?.startDate ?? today))) return setError('Дата достижения должна быть в будущем');
    actions.saveGoal({ id: existing?.id, name, description, icon, color, targetDate: hasDate ? targetDate : null, habitIds: ids });
    toast({ title: existing ? 'Цель обновлена' : 'Цель создана', description: name.trim() });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existing ? 'Изменить цель' : 'Новая цель'}
      description="Большая цель, к которой ведут ежедневные привычки"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="primary" type="submit" form={`${uid}-f`}>
            <Check size={16} /> Сохранить
          </Button>
        </>
      }
    >
      <form id={`${uid}-f`} onSubmit={submit} noValidate className="space-y-5">
        <Field label="Цель" htmlFor={`${uid}-n`}>
          <TextInput id={`${uid}-n`} data-autofocus value={name} maxLength={80} placeholder="Например, пробежать полумарафон" onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Описание" htmlFor={`${uid}-d`} hint="Зачем это вам и как поймёте, что цель достигнута">
          <TextArea id={`${uid}-d`} rows={2} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Иконка">
            {ICONS.map((n) => {
              const I = habitIcon(n);
              return (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={icon === n}
                  aria-label={n}
                  onClick={() => setIcon(n)}
                  className={cn('grid h-9 w-9 place-items-center rounded-xl border', icon === n ? 'border-transparent' : 'border-line bg-fill text-muted')}
                  style={icon === n ? { background: `color-mix(in oklab, ${colorOf(color)} 20%, transparent)`, color: colorOf(color) } : undefined}
                >
                  <I size={16} />
                </button>
              );
            })}
          </div>
          <div className="flex gap-1.5" role="radiogroup" aria-label="Цвет">
            {HABIT_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={color === c.id}
                aria-label={c.label}
                onClick={() => setColor(c.id)}
                className="h-7 w-7 rounded-full"
                style={{ background: c.hex, boxShadow: color === c.id ? `0 0 0 2px var(--bg-elevated), 0 0 0 4px ${c.hex}` : undefined }}
              />
            ))}
          </div>
        </div>
        <div className="glass-subtle space-y-3 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <label htmlFor={`${uid}-t`} className="text-sm font-medium text-fg">
              Дата достижения
            </label>
            <Switch size="sm" checked={hasDate} onChange={setHasDate} label="Указать дату достижения" />
          </div>
          {hasDate ? (
            <TextInput id={`${uid}-t`} type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          ) : (
            <p className="text-sm text-subtle">Без срока — прогресс считается за 90 дней от начала</p>
          )}
        </div>
        <fieldset>
          <legend className="mb-2 text-[13px] font-medium text-muted">Привычки, ведущие к цели</legend>
          {habits.length === 0 ? (
            <p className="text-sm text-subtle">Создайте привычки, чтобы привязать их к цели.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {habits.map((h) => (
                <Chip key={h.id} active={ids.includes(h.id)} onClick={() => setIds(ids.includes(h.id) ? ids.filter((x) => x !== h.id) : [...ids, h.id])}>
                  {h.name}
                </Chip>
              ))}
            </div>
          )}
        </fieldset>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
