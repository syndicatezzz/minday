'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { CornerDownLeft, Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { cn } from '@/lib/cn';
import { feedback } from '@/lib/feedback';
import { DURATION, tween } from '@/lib/motion';
import { actions } from '@/lib/store/app-store';
import { toast } from '@/lib/store/toast-store';
import { ui } from '@/lib/store/ui-store';

/** Быстрое добавление привычки одной строкой: название + Enter. */
export function QuickAdd({ className }: { className?: string }) {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const id = actions.quickAddHabit(value);
    if (!id) return;
    feedback.tap();
    toast({
      title: 'Привычка добавлена',
      description: `${value.trim()} · каждый день`,
      action: { label: 'Настроить', onClick: () => ui.openHabitModal(id) },
    });
    setValue('');
  };

  return (
    <form
      onSubmit={submit}
      className={cn(
        'glass glass-hover flex h-14 items-center gap-3 rounded-[20px] pr-2 pl-4 transition-shadow',
        focused && 'shadow-[0_0_0_4px_color-mix(in_oklab,var(--accent)_14%,transparent)]',
        className,
      )}
    >
      <Plus size={18} className={cn('shrink-0 transition-colors', focused ? 'text-accent' : 'text-subtle')} aria-hidden />
      <label htmlFor="quick-add" className="sr-only">
        Быстро добавить привычку
      </label>
      <input
        id="quick-add"
        value={value}
        maxLength={60}
        autoComplete="off"
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Быстро добавить привычку — например, «Читать 20 минут»"
        className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-fg placeholder:text-subtle focus:outline-none"
      />
      <AnimatePresence>
        {value.trim() && (
          <motion.button
            type="submit"
            initial={{ opacity: 0, scale: 0.8, x: 6 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 6 }}
            transition={tween(DURATION.fast)}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-fg px-3.5 text-[13px] font-medium text-bg active:scale-95"
          >
            Добавить <CornerDownLeft size={14} />
          </motion.button>
        )}
      </AnimatePresence>
    </form>
  );
}
