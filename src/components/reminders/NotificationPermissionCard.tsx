'use client';

import { BellOff, BellRing, CircleCheck, ShieldAlert, Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { APP_CONFIG } from '@/config/app';
import { cn } from '@/lib/cn';
import { notificationChannel, type NotificationPermissionState } from '@/lib/reminders/notifications';
import { actions, useApp } from '@/lib/store/app-store';
import { toast } from '@/lib/store/toast-store';

export function useNotificationPermission() {
  const [perm, setPerm] = useState<NotificationPermissionState>('default');
  useEffect(() => {
    const read = () => setPerm(notificationChannel.permission());
    read();
    window.addEventListener('focus', read);
    return () => window.removeEventListener('focus', read);
  }, []);
  return [perm, setPerm] as const;
}

const PERM_META: Record<NotificationPermissionState, { label: string; tone: string; Icon: typeof BellRing }> = {
  granted: { label: 'Разрешено', tone: 'text-success bg-success/12', Icon: CircleCheck },
  default: { label: 'Не запрошено', tone: 'text-muted bg-fill', Icon: Info },
  denied: { label: 'Заблокировано браузером', tone: 'text-danger bg-danger/12', Icon: ShieldAlert },
  unsupported: { label: 'Не поддерживается', tone: 'text-warning bg-warning/12', Icon: BellOff },
};

export function NotificationPermissionCard({ compact }: { compact?: boolean }) {
  const enabled = useApp((s) => s.data.settings.notificationsEnabled);
  const [perm, setPerm] = useNotificationPermission();
  const meta = PERM_META[perm];

  const enable = async () => {
    let p = perm;
    if (p === 'default') p = await notificationChannel.requestPermission();
    setPerm(p);
    if (p === 'granted') {
      actions.updateSettings({ notificationsEnabled: true });
      toast({ title: 'Уведомления включены', description: 'Напоминания будут приходить, пока приложение открыто' });
    } else if (p === 'denied') {
      toast({ tone: 'error', title: 'Браузер заблокировал уведомления', description: 'Разрешите их в настройках сайта (значок замка в адресной строке)' });
    } else if (p === 'unsupported') {
      toast({ tone: 'error', title: 'Браузер не поддерживает уведомления', description: 'Напоминания будут показываться внутри приложения' });
    }
  };

  const toggle = (v: boolean) => {
    if (v) void enable();
    else {
      actions.updateSettings({ notificationsEnabled: false });
      toast({ tone: 'info', title: 'Уведомления браузера выключены', description: 'Напоминания останутся внутри приложения' });
    }
  };

  const test = async () => {
    const ok = await notificationChannel.show({ title: `${APP_CONFIG.name}`, body: 'Так будут выглядеть напоминания о привычках', tag: 'test' });
    if (!ok) toast({ tone: 'error', title: 'Не удалось показать уведомление' });
  };

  return (
    <div className={cn('glass rounded-[24px]', compact ? 'p-5' : 'p-5 sm:p-6')}>
      <div className="flex items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent/12 text-accent">
          <BellRing size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold text-fg">Уведомления браузера</h2>
            <Switch checked={enabled && perm === 'granted'} onChange={toggle} label="Уведомления браузера" disabled={perm === 'unsupported'} />
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">
            Помогают не забыть о привычке в нужный момент. Мы запросим разрешение браузера только после вашего нажатия.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={cn('inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium', meta.tone)}>
              <meta.Icon size={13} /> {meta.label}
            </span>
            {perm === 'default' && (
              <Button size="sm" variant="primary" onClick={() => void enable()}>
                Разрешить уведомления
              </Button>
            )}
            {perm === 'granted' && enabled && (
              <Button size="sm" variant="subtle" onClick={() => void test()}>
                Проверить
              </Button>
            )}
          </div>
          {perm === 'denied' && (
            <p className="mt-2 text-xs text-subtle">
              Чтобы включить, откройте настройки сайта в браузере (значок слева от адреса) и разрешите уведомления, затем вернитесь сюда.
            </p>
          )}
          <p className="mt-3 text-xs leading-relaxed text-subtle">
            Напоминания работают, пока {APP_CONFIG.name} открыт во вкладке (можно в фоне). Когда браузер закрыт, уведомления не приходят —
            для этого потребуется серверная push-инфраструктура.
          </p>
        </div>
      </div>
    </div>
  );
}
