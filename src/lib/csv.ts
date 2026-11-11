import type { AppData } from '@/types';
import { APP_CONFIG } from '@/config/app';
import { CATEGORY_LABEL } from '@/lib/habits/meta';
import { toast } from '@/lib/store/toast-store';

const cell = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function toCsv(rows: unknown[][]): string {
  // Точка с запятой и BOM — корректное открытие кириллицы в Excel
  return '﻿' + rows.map((r) => r.map(cell).join(';')).join('\r\n');
}

const STATUS: Record<string, string> = { completed: 'выполнено', missed: 'пропущено', pending: 'в процессе', moved: 'перенесено' };

export function buildCsv(data: AppData): Record<string, string> {
  const habits = data.habits;
  const entries = Object.values(data.entries)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => {
      const h = habits[e.habitId];
      return [e.date, h?.name ?? '', h ? CATEGORY_LABEL[h.category] : '', STATUS[e.status] ?? e.status, e.count, h?.unit ?? '', h?.targetPerDay ?? '', e.completedAt ?? '', e.movedTo ?? ''];
    });
  const journal = Object.values(data.journal)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((j) => [j.date, j.mood || '', j.note, j.reflection]);
  const focus = Object.values(data.focusSessions)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .map((f) => [f.date, f.habitId ? habits[f.habitId]?.name ?? '' : '', Math.round(f.plannedMs / 60000), Math.round(f.actualMs / 6000) / 10, f.completed ? 'да' : 'нет']);
  return {
    'entries.csv': toCsv([['Дата', 'Привычка', 'Категория', 'Статус', 'Результат', 'Единица', 'Цель', 'Отмечено', 'Перенесено на'], ...entries]),
    'journal.csv': toCsv([['Дата', 'Настроение (1–5)', 'Заметка', 'Рефлексия'], ...journal]),
    'focus.csv': toCsv([['Дата', 'Привычка', 'План, мин', 'Факт, мин', 'Завершена'], ...focus]),
  };
}

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportCsv(data: AppData, which: 'entries.csv' | 'journal.csv' | 'focus.csv') {
  const files = buildCsv(data);
  download(`${APP_CONFIG.storagePrefix}-${which.replace('.csv', '')}-${new Date().toISOString().slice(0, 10)}.csv`, files[which], 'text/csv;charset=utf-8');
  toast({ title: 'CSV скачан', description: 'Откроется в Excel, Numbers или Google Таблицах' });
}
