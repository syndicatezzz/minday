'use client';

import { CircleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { HabitModal } from '@/components/habits/HabitModal';
import { Onboarding } from '@/components/onboarding/Onboarding';
import { ReminderModal } from '@/components/reminders/ReminderModal';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { Toaster } from '@/components/ui/Toaster';
import { actions, useApp } from '@/lib/store/app-store';
import { ui } from '@/lib/store/ui-store';
import { DemoBanner } from './DemoBanner';
import { BottomNavigation, MobileDrawer, MobileTopBar } from './MobileNav';
import { PageTransition } from './PageTransition';
import { Sidebar } from './Sidebar';

function SaveErrorBar() {
  const saveError = useApp((s) => s.saveError);
  if (!saveError) return null;
  return (
    <div role="alert" className="mb-6 flex items-center gap-2.5 rounded-2xl border border-danger/25 bg-danger/[0.08] px-4 py-3 text-[13px] text-danger">
      <CircleAlert size={16} /> {saveError}. Экспортируйте данные в настройках, чтобы не потерять изменения.
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const status = useApp((s) => s.status);
  const error = useApp((s) => s.error);

  return (
    <>
      <div className="app-backdrop" aria-hidden>
        <span />
      </div>
      <div className="app-grain" aria-hidden />
      <a
        href="#main"
        className="fixed top-3 left-3 z-[90] -translate-y-20 rounded-xl bg-fg px-4 py-2 text-sm text-bg transition-transform focus:translate-y-0"
      >
        Перейти к содержимому
      </a>

      <Sidebar />
      <MobileTopBar />
      <MobileDrawer />

      <main id="main" className="relative z-10 pt-3 pb-32 lg:pt-10 lg:pb-16 lg:pl-[272px]">
        <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-10">
          {status === 'loading' && <PageSkeleton />}
          {status === 'error' && (
            <EmptyState
              icon={<CircleAlert size={26} />}
              title="Не удалось загрузить данные"
              description={`${error ?? 'Неизвестная ошибка'}. Можно начать заново — повреждённые данные будут удалены.`}
              action={
                <Button
                  variant="danger"
                  onClick={async () => {
                    const ok = await ui.confirm({
                      title: 'Начать заново?',
                      description: 'Повреждённые данные будут удалены без возможности восстановления.',
                      confirmLabel: 'Сбросить',
                      tone: 'danger',
                    });
                    if (ok === true) await actions.recoverFromError();
                  }}
                >
                  Сбросить данные
                </Button>
              }
            />
          )}
          {status === 'ready' && (
            <>
              <SaveErrorBar />
              <DemoBanner />
              <PageTransition>{children}</PageTransition>
            </>
          )}
        </div>
      </main>

      <BottomNavigation />
      <HabitModal />
      <ReminderModal />
      <ConfirmDialog />
      <Onboarding />
      <Toaster />
    </>
  );
}
