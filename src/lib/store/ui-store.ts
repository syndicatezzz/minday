import { createStore } from './create-store';

export interface ConfirmRequest {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'default';
  /** Дополнительное действие (например, «Архивировать вместо удаления»). */
  secondary?: { label: string; value: string };
}

interface UIState {
  habitModal: { open: boolean; habitId: string | null };
  reminderModal: { open: boolean; reminderId: string | null; habitId: string | null };
  drawerOpen: boolean;
  confirm: (ConfirmRequest & { resolve: (v: boolean | string) => void }) | null;
}

export const uiStore = createStore<UIState>({
  habitModal: { open: false, habitId: null },
  reminderModal: { open: false, reminderId: null, habitId: null },
  drawerOpen: false,
  confirm: null,
});

export const ui = {
  openHabitModal(habitId: string | null = null) {
    uiStore.set({ habitModal: { open: true, habitId }, drawerOpen: false });
  },
  closeHabitModal() {
    uiStore.set((s) => ({ ...s, habitModal: { ...s.habitModal, open: false } }));
  },
  openReminderModal(reminderId: string | null = null, habitId: string | null = null) {
    uiStore.set({ reminderModal: { open: true, reminderId, habitId } });
  },
  closeReminderModal() {
    uiStore.set((s) => ({ ...s, reminderModal: { ...s.reminderModal, open: false } }));
  },
  setDrawer(open: boolean) {
    uiStore.set({ drawerOpen: open });
  },
  /** Промис-диалог подтверждения: true — подтверждено, строка — выбрано доп. действие. */
  confirm(req: ConfirmRequest): Promise<boolean | string> {
    return new Promise((resolve) => {
      uiStore.set({ confirm: { ...req, resolve } });
    });
  },
  resolveConfirm(value: boolean | string) {
    const c = uiStore.get().confirm;
    uiStore.set({ confirm: null });
    c?.resolve(value);
  },
};
