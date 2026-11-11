'use client';

import { Reorder, motion, useDragControls } from 'framer-motion';
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { useEffect, useState, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';
import { feedback } from '@/lib/feedback';
import { colorOf } from '@/lib/habits/meta';
import { springSnappy } from '@/lib/motion';
import { actions } from '@/lib/store/app-store';
import type { Habit } from '@/types';
import { habitIcon } from './habit-icons';

function Row({
  habit,
  index,
  total,
  onMove,
  onCommit,
}: {
  habit: Habit;
  index: number;
  total: number;
  onMove: (from: number, to: number) => void;
  onCommit: () => void;
}) {
  const controls = useDragControls();
  const [dragging, setDragging] = useState(false);
  const Icon = habitIcon(habit.icon);
  const color = colorOf(habit.color);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowUp' && index > 0) {
      e.preventDefault();
      onMove(index, index - 1);
    } else if (e.key === 'ArrowDown' && index < total - 1) {
      e.preventDefault();
      onMove(index, index + 1);
    }
  };

  return (
    <Reorder.Item
      value={habit.id}
      dragListener={false}
      dragControls={controls}
      onDragStart={() => {
        setDragging(true);
        feedback.tap();
      }}
      onDragEnd={() => {
        setDragging(false);
        onCommit();
      }}
      transition={springSnappy}
      whileDrag={{ scale: 1.02 }}
      className="relative list-none"
    >
      <div
        className={cn(
          'glass flex items-center gap-3 rounded-[20px] p-3 pr-2 transition-shadow',
          dragging && 'shadow-[var(--shadow-lg),var(--glow)]',
        )}
      >
        <button
          type="button"
          aria-label={`Переместить «${habit.name}». Стрелки вверх и вниз меняют порядок`}
          onPointerDown={(e) => controls.start(e)}
          onKeyDown={onKey}
          className="grid h-10 w-9 shrink-0 cursor-grab touch-none place-items-center rounded-xl text-subtle hover:bg-fill hover:text-fg active:cursor-grabbing"
        >
          <GripVertical size={18} />
        </button>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, color }}>
          <Icon size={18} />
        </span>
        <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-fg">{habit.name}</span>
        <span className="text-xs text-subtle tabular-nums">{index + 1}</span>
        <div className="flex">
          <button type="button" aria-label="Выше" disabled={index === 0} onClick={() => onMove(index, index - 1)} className="grid h-9 w-9 place-items-center rounded-xl text-subtle hover:bg-fill hover:text-fg disabled:opacity-25">
            <ChevronUp size={16} />
          </button>
          <button type="button" aria-label="Ниже" disabled={index === total - 1} onClick={() => onMove(index, index + 1)} className="grid h-9 w-9 place-items-center rounded-xl text-subtle hover:bg-fill hover:text-fg disabled:opacity-25">
            <ChevronDown size={16} />
          </button>
        </div>
      </div>
    </Reorder.Item>
  );
}

/** Drag-and-drop порядка привычек (мышь, палец или клавиатура). */
export function ReorderList({ habits }: { habits: Habit[] }) {
  const [ids, setIds] = useState(() => habits.map((h) => h.id));
  useEffect(() => setIds(habits.map((h) => h.id)), [habits]);
  const byId = Object.fromEntries(habits.map((h) => [h.id, h]));

  const commit = (next = ids) => actions.reorderHabits(next);
  const move = (from: number, to: number) => {
    const next = [...ids];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    setIds(next);
    commit(next);
    feedback.tap();
    window.requestAnimationFrame(() =>
      document.querySelectorAll<HTMLElement>('[data-reorder] li button[aria-label^="Переместить"]')[to]?.focus(),
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} data-reorder>
      <Reorder.Group axis="y" values={ids} onReorder={setIds} className="space-y-2.5">
        {ids.map((id, i) =>
          byId[id] ? <Row key={id} habit={byId[id]} index={i} total={ids.length} onMove={move} onCommit={() => commit()} /> : null,
        )}
      </Reorder.Group>
    </motion.div>
  );
}
