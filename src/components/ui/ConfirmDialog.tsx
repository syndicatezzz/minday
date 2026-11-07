'use client';

import { TriangleAlert } from 'lucide-react';
import { useStore } from '@/lib/store/create-store';
import { ui, uiStore } from '@/lib/store/ui-store';
import { Button } from './Button';
import { Modal } from './Modal';

/** Глобальный диалог подтверждения, вызывается через ui.confirm(). */
export function ConfirmDialog() {
  const req = useStore(uiStore, (s) => s.confirm);
  return (
    <Modal
      open={!!req}
      onClose={() => ui.resolveConfirm(false)}
      size="sm"
      title={
        <span className="flex items-center gap-2.5">
          {req?.tone === 'danger' && (
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-danger/12 text-danger">
              <TriangleAlert size={16} />
            </span>
          )}
          {req?.title}
        </span>
      }
      description={req?.description}
      footer={
        <>
          <Button variant="ghost" onClick={() => ui.resolveConfirm(false)} data-autofocus>
            {req?.cancelLabel ?? 'Отмена'}
          </Button>
          {req?.secondary && (
            <Button variant="subtle" onClick={() => ui.resolveConfirm(req.secondary!.value)}>
              {req.secondary.label}
            </Button>
          )}
          <Button variant={req?.tone === 'danger' ? 'danger' : 'primary'} onClick={() => ui.resolveConfirm(true)}>
            {req?.confirmLabel ?? 'Подтвердить'}
          </Button>
        </>
      }
    >
      <span className="sr-only">Подтвердите действие</span>
    </Modal>
  );
}
