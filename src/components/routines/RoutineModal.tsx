'use client';

import { Reorder } from 'framer-motion';
import { Check, GripVertical, Plus, X } from 'lucide-react';
import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import { habitIcon } from '@/components/habits/habit-icons';
import { Button } from '@/components/ui/Button';
import { Field, TextInput } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';
import { HABIT_COLORS, colorOf } from '@/lib/habits/meta';
import { springSnappy } from '@/lib/motion';
import { actions, useApp } from '@/lib/store/app-store';
import { toast } from '@/lib/store/toast-store';
import type { HabitColor } from '@/types';

export const ROUTINE_TEMPLATES = [
  { name: 'Утренняя рутина', icon: 'Sun', color: 'amber' as HabitColor },
  { name: 'Вечерняя рутина', icon: 'Moon', color: 'violet' as HabitColor },
  { name: 'Тренировка', icon: 'Dumbbell', color: 'coral' as HabitColor },
  { name: 'Учёба', icon: 'BookOpen', color: 'sky' as HabitColor },
];

const ICONS = ['Sun', 'Moon', 'Dumbbell', 'BookOpen', 'Brain', 'Leaf', 'Coffee', 'Target'];

export function RoutineModal({
  open,
  routineId,
  template,
  onClose,
}: {
  open: boolean;
  routineId: string | null;
  template: (typeof ROUTINE_TEMPLATES)[number] | null;
  onClose: () => void;
}) {
  const routines = useApp((s) => s.data.routines);
  const habitsMap = useApp((s) => s.data.habits);
  const habits = useMemo(() => Object.values(habitsMap).filter((h) => !h.archivedOn).sort((a, b) => a.order - b.order), [habitsMap]);
  const existing = routineId ? routines[routineId] : undefined;
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('Sun');
  const [color, setColor] = useState<HabitColor>('amber');
  const [ids, setIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const uid = useId();

  useEffect(() => {
    if (!open) return;
    setName(existing?.name ?? template?.name ?? '');
    setIcon(existing?.icon ?? template?.icon ?? 'Sun');
    setColor(existing?.color ?? template?.color ?? 'amber');
    setIds(existing?.habitIds ?? []);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, routineId]);

  const available = habits.filter((h) => !ids.includes(h.id));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Введите название');
    if (!ids.length) return setError('Добавьте хотя бы одну привычку');
    actions.saveRoutine({ id: existing?.id, name, icon, color, habitIds: ids });
    toast({ title: existing ? 'Рутина обновлена' : 'Рутина создана', description: name.trim() });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existing ? 'Изменить рутину' : 'Новая рутина'}
      description="Последовательность привычек, которую можно пройти шаг за шагом"
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
        <Field label="Название" htmlFor={`${uid}-n`}>
          <TextInput id={`${uid}-n`} data-autofocus value={name} maxLength={60} placeholder="Например, Утренняя рутина" onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-1.5" role="radiogroup" aria-label="Иконка">
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
                  className={cn('grid h-9 w-9 place-items-center rounded-xl border transition-colors', icon === n ? 'border-transparent' : 'border-line bg-fill text-muted')}
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

        <div>
          <p className="mb-2 text-[13px] font-medium text-muted">Шаги · {ids.length}</p>
          {ids.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-subtle">Добавьте привычки из списка ниже</p>
          ) : (
            <Reorder.Group axis="y" values={ids} onReorder={setIds} className="space-y-1.5">
              {ids.map((id, i) => {
                const h = habitsMap[id];
                if (!h) return null;
                const I = habitIcon(h.icon);
                return (
                  <Reorder.Item key={id} value={id} transition={springSnappy} whileDrag={{ scale: 1.02 }} className="flex cursor-grab touch-none items-center gap-2.5 rounded-2xl bg-fill p-2 active:cursor-grabbing">
                    <GripVertical size={15} className="text-subtle" aria-hidden />
                    <span className="w-4 text-center text-xs text-subtle tabular-nums">{i + 1}</span>
                    <I size={15} style={{ color: colorOf(h.color) }} />
                    <span className="min-w-0 flex-1 truncate text-sm text-fg">{h.name}</span>
                    <button
                      type="button"
                      aria-label={`Убрать «${h.name}»`}
                      onClick={() => setIds(ids.filter((x) => x !== id))}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="grid h-8 w-8 place-items-center rounded-lg text-subtle hover:bg-fill-strong hover:text-fg"
                    >
                      <X size={14} />
                    </button>
                  </Reorder.Item>
                );
              })}
            </Reorder.Group>
          )}
        </div>

        {available.length > 0 && (
          <div>
            <p className="mb-2 text-[13px] font-medium text-muted">Добавить привычку</p>
            <div className="flex flex-wrap gap-1.5">
              {available.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setIds([...ids, h.id])}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-fill px-3 text-[13px] text-muted transition-colors hover:bg-fill-strong hover:text-fg"
                >
                  <Plus size={13} /> {h.name}
                </button>
              ))}
            </div>
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
