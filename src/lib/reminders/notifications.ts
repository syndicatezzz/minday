/**
 * Канал доставки уведомлений. Сейчас используется Notification API браузера,
 * пока вкладка открыта. Для доставки при закрытом приложении достаточно
 * добавить реализацию на базе Service Worker + Web Push (PushChannel)
 * и серверную рассылку — остальной код менять не придётся.
 */
export interface NotificationChannel {
  readonly id: string;
  isSupported(): boolean;
  permission(): NotificationPermissionState;
  requestPermission(): Promise<NotificationPermissionState>;
  show(payload: { title: string; body: string; tag: string }): Promise<boolean>;
}

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export class BrowserNotificationChannel implements NotificationChannel {
  readonly id = 'browser';

  isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  permission(): NotificationPermissionState {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission as NotificationPermissionState;
  }

  async requestPermission(): Promise<NotificationPermissionState> {
    if (!this.isSupported()) return 'unsupported';
    try {
      const result = await Notification.requestPermission();
      return result as NotificationPermissionState;
    } catch {
      return this.permission();
    }
  }

  async show(payload: { title: string; body: string; tag: string }): Promise<boolean> {
    if (this.permission() !== 'granted') return false;
    try {
      // Некоторые мобильные браузеры разрешают уведомления только через Service Worker.
      const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
      if (reg) {
        await reg.showNotification(payload.title, { body: payload.body, tag: payload.tag, icon: '/icon.svg' });
        return true;
      }
      const n = new Notification(payload.title, { body: payload.body, tag: payload.tag, icon: '/icon.svg' });
      n.onclick = () => {
        window.focus();
        n.close();
      };
      return true;
    } catch {
      return false;
    }
  }
}

export const notificationChannel: NotificationChannel = new BrowserNotificationChannel();
