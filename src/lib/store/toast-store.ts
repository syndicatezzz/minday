import { createStore } from './create-store';
import { createId } from '@/lib/id';

export type ToastTone = 'success' | 'error' | 'info' | 'reminder';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
  duration: number;
  action?: { label: string; onClick: () => void };
}

export const toastStore = createStore<{ toasts: ToastItem[] }>({ toasts: [] });

export function toast(input: Omit<ToastItem, 'id' | 'tone' | 'duration'> & { tone?: ToastTone; duration?: number }) {
  const item: ToastItem = { id: createId('t'), tone: 'success', duration: 3800, ...input };
  toastStore.set((s) => ({ toasts: [...s.toasts.slice(-3), item] }));
  return item.id;
}

export function dismissToast(id: string) {
  toastStore.set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
}
