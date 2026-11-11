import { APP_CONFIG } from '@/config/app';
import { buildBackup } from '@/lib/storage/schema';
import { appStore } from '@/lib/store/app-store';
import { toast } from '@/lib/store/toast-store';

/** Скачивает резервную копию всех данных в JSON. */
export function exportBackup() {
  const { data, mode } = appStore.get();
  const blob = new Blob([JSON.stringify(buildBackup(data), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${APP_CONFIG.storagePrefix}-backup-${new Date().toISOString().slice(0, 10)}${mode === 'demo' ? '-demo' : ''}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast({ title: 'Резервная копия скачана', description: 'Файл JSON с привычками, историей и настройками' });
}
