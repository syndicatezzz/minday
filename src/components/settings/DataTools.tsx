'use client';

import { Download, FileSpreadsheet, History, Smartphone, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { exportCsv } from '@/lib/csv';
import { formatLongDate } from '@/lib/date';
import { installApp, useInstallState } from '@/lib/pwa';
import { listSnapshots, type Snapshot } from '@/lib/storage/snapshots';
import { actions, appStore } from '@/lib/store/app-store';
import { toast } from '@/lib/store/toast-store';
import { ui } from '@/lib/store/ui-store';

export function CsvExport() {
  return (
    <div className="flex flex-wrap gap-2">
      {(
        [
          ['entries.csv', 'Отметки'],
          ['journal.csv', 'Дневник'],
          ['focus.csv', 'Фокус'],
        ] as const
      ).map(([file, label]) => (
        <Button key={file} size="sm" variant="subtle" onClick={() => exportCsv(appStore.get().data, file)}>
          <FileSpreadsheet size={14} /> {label} · CSV
        </Button>
      ))}
    </div>
  );
}

export function Snapshots() {
  const [list, setList] = useState<Snapshot[]>([]);
  useEffect(() => setList(listSnapshots()), []);
  if (!list.length) return <p className="text-xs text-subtle">Автокопии появятся с завтрашнего дня — одна в день, хранятся три последние.</p>;
  return (
    <ul className="space-y-1.5">
      {list.map((s) => (
        <li key={s.savedAt} className="flex items-center gap-3 rounded-2xl bg-fill px-3 py-2 text-sm">
          <History size={15} className="shrink-0 text-subtle" />
          <span className="min-w-0 flex-1">
            <span className="block text-fg">{formatLongDate(s.date)}</span>
            <span className="block text-xs text-subtle">
              {s.habits} привыч. · {s.entries} отметок
            </span>
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              const ok = await ui.confirm({
                title: 'Восстановить эту копию?',
                description: `Текущие данные будут заменены копией от ${formatLongDate(s.date)}. Советуем сначала скачать экспорт JSON.`,
                confirmLabel: 'Восстановить',
                tone: 'danger',
              });
              if (ok !== true) return;
              try {
                await actions.importData(s.data);
                toast({ title: 'Данные восстановлены', description: formatLongDate(s.date) });
              } catch (e) {
                toast({ tone: 'error', title: 'Не удалось восстановить', description: e instanceof Error ? e.message : '' });
              }
            }}
          >
            Восстановить
          </Button>
        </li>
      ))}
    </ul>
  );
}

export function InstallApp() {
  const state = useInstallState();
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-accent/12 text-accent">
          <Smartphone size={18} />
        </span>
        <div className="min-w-0 flex-1 text-[13px] leading-relaxed text-muted">
          {state === 'installed' && 'Приложение уже установлено на это устройство.'}
          {state === 'available' && 'Установите MINDAY как отдельное приложение — с иконкой на главном экране и работой без интернета.'}
          {state === 'ios' && 'На iPhone: нажмите «Поделиться» в Safari и выберите «На экран „Домой“».'}
          {state === 'unavailable' && 'Браузер пока не предлагает установку. В Chrome/Edge — меню ⋮ → «Установить приложение»; на iPhone — «Поделиться» → «На экран „Домой“».'}
        </div>
        {state === 'available' && (
          <Button size="sm" variant="primary" onClick={() => void installApp()}>
            <Download size={14} /> Установить
          </Button>
        )}
      </div>
      <p className="flex items-center gap-2 text-xs text-subtle">
        <WifiOff size={13} /> После первого открытия приложение работает офлайн: данные хранятся на устройстве.
      </p>
    </div>
  );
}
