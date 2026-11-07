'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { EASE_OUT } from '@/lib/motion';
import { Portal } from './Portal';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Элемент, который получит фокус при открытии. */
  initialFocusSelector?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

let openCount = 0;

export function Modal({ open, onClose, title, description, children, footer, size = 'md', initialFocusSelector }: ModalProps) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    openCount++;
    document.body.style.overflow = 'hidden';
    const t = window.setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const target =
        (initialFocusSelector && panel.querySelector<HTMLElement>(initialFocusSelector)) ||
        panel.querySelector<HTMLElement>('[data-autofocus]') ||
        panel;
      target.focus({ preventScroll: true });
    }, 60);

    const onKey = (e: KeyboardEvent) => {
      const panel = panelRef.current;
      if (!panel) return;
      // Реагирует только самое верхнее модальное окно
      const all = document.querySelectorAll('[data-modal-panel]');
      if (all[all.length - 1] !== panel) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
      }
      if (e.key === 'Tab') {
        const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      openCount = Math.max(0, openCount - 1);
      if (openCount === 0) document.body.style.overflow = '';
      previous?.focus?.({ preventScroll: true });
    };
  }, [open, initialFocusSelector]);

  const widths = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-2xl' };

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6">
            <motion.div
              aria-hidden
              className="absolute inset-0 bg-black/35 backdrop-blur-[6px] dark:bg-black/55"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={onClose}
            />
            <motion.div
              ref={panelRef}
              data-modal-panel
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={description ? descId : undefined}
              tabIndex={-1}
              initial={{ opacity: 0, y: 48, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.42, ease: EASE_OUT } }}
              exit={{ opacity: 0, y: 24, scale: 0.98, transition: { duration: 0.2 } }}
              className={cn(
                'glass-solid relative flex max-h-[92dvh] w-full flex-col rounded-t-[28px] outline-none sm:rounded-[28px]',
                widths[size],
              )}
            >
              <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-fill-strong sm:hidden" aria-hidden />
              <header className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 sm:px-7 sm:pt-7">
                <div className="min-w-0">
                  <h2 id={titleId} className="text-xl font-semibold tracking-[-0.02em] text-fg">
                    {title}
                  </h2>
                  {description && (
                    <p id={descId} className="mt-1 text-sm text-muted">
                      {description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Закрыть"
                  className="-mr-2 grid h-10 w-10 shrink-0 place-items-center rounded-xl text-subtle transition-colors hover:bg-fill hover:text-fg"
                >
                  <X size={18} />
                </button>
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6 sm:px-7">{children}</div>
              {footer && (
                <footer className="flex flex-col-reverse gap-2 border-t border-line px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-end sm:px-7">
                  {footer}
                </footer>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
