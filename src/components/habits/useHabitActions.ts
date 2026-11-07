'use client';

import { useCallback } from 'react';
import { actions } from '@/lib/store/app-store';
import { toast } from '@/lib/store/toast-store';
import { ui } from '@/lib/store/ui-store';
import type { Habit } from '@/types';

/** Безопасное удаление: подтверждение, альтернатива «в архив» и отмена через toast. */
export function useDeleteHabit() {
  return useCallback(async (habit: Habit): Promise<boolean> => {
    const answer = await ui.confirm({
      title: 'Удалить привычку?',
      description: `«${habit.name}» и вся её история выполнений будут удалены. Если хотите сохранить статистику — отправьте привычку в архив.`,
      confirmLabel: 'Удалить',
      tone: 'danger',
      secondary: habit.archivedOn ? undefined : { label: 'В архив', value: 'archive' },
    });
    if (answer === 'archive') {
      actions.archiveHabit(habit.id);
      toast({ title: 'Перемещено в архив', description: 'История сохранена' });
      return true;
    }
    if (answer !== true) return false;
    const snapshot = actions.deleteHabit(habit.id);
    if (snapshot) {
      toast({
        title: 'Привычка удалена',
        description: habit.name,
        duration: 7000,
        action: { label: 'Отменить', onClick: () => actions.restoreHabit(snapshot) },
      });
    }
    return true;
  }, []);
}
