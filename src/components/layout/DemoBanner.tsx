'use client';

import { motion } from 'framer-motion';
import { FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { actions, useApp } from '@/lib/store/app-store';
import { toast } from '@/lib/store/toast-store';
import { ui } from '@/lib/store/ui-store';

export function DemoBanner() {
  const mode = useApp((s) => s.mode);
  if (mode !== 'demo') return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 flex flex-col gap-3 rounded-2xl border border-warning/25 bg-warning/[0.08] p-3.5 sm:flex-row sm:items-center sm:justify-between sm:pl-4"
    >
      <p className="flex items-start gap-2.5 text-[13px] leading-snug text-muted">
        <FlaskConical size={16} className="mt-0.5 shrink-0 text-warning" />
        <span>
          <span className="font-medium text-fg">Демо-режим.</span> Это примерные данные — ваши реальные данные хранятся отдельно и не затронуты.
        </span>
      </p>
      <Button
        size="sm"
        variant="subtle"
        onClick={async () => {
          const ok = await ui.confirm({
            title: 'Выйти из демо-режима?',
            description: 'Демо-данные будут удалены, вы вернётесь к своим реальным привычкам.',
            confirmLabel: 'Выйти из демо',
          });
          if (ok === true) {
            await actions.exitDemo();
            toast({ title: 'Демо-режим выключен', description: 'Теперь всё — по-настоящему' });
          }
        }}
      >
        Начать своё
      </Button>
    </motion.div>
  );
}
