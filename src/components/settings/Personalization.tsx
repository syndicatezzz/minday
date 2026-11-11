'use client';

import { motion } from 'framer-motion';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { Segmented } from '@/components/ui/Segmented';
import { Switch } from '@/components/ui/Switch';
import { cn } from '@/lib/cn';
import { springSnappy } from '@/lib/motion';
import { actions, useApp } from '@/lib/store/app-store';
import type { AccentName, Appearance, DashboardWidget } from '@/types';

const ACCENTS: { id: AccentName; label: string; light: string; dark: string }[] = [
  { id: 'violet', label: 'Лаванда', light: '#6a5af0', dark: '#a99cff' },
  { id: 'sky', label: 'Небо', light: '#2b86c9', dark: '#7cc4ff' },
  { id: 'teal', label: 'Бирюза', light: '#1f9a8a', dark: '#6fd8c6' },
  { id: 'rose', label: 'Роза', light: '#cf4f78', dark: '#f29ab8' },
  { id: 'amber', label: 'Янтарь', light: '#b9761b', dark: '#f0c27a' },
  { id: 'silver', label: 'Серебро', light: '#5d6577', dark: '#c9ced9' },
];

const WIDGET_LABEL: Record<DashboardWidget, string> = {
  streak: 'Серия дней',
  week: 'Эта неделя',
  review: 'Итоги недели',
  goals: 'Цели',
  focus: 'Фокус',
  journal: 'Настроение',
  last7: 'Последние 7 дней',
  quote: 'Фраза дня',
};

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-fg">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-subtle">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function PersonalizationSettings() {
  const a = useApp((s) => s.data.settings.appearance);
  const set = (patch: Partial<Appearance>) => actions.updateAppearance(patch);
  return (
    <div className="space-y-5">
      <Row label="Акцентный цвет">
        <div className="flex gap-2" role="radiogroup" aria-label="Акцентный цвет">
          {ACCENTS.map((c) => {
            const active = a.accent === c.id;
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={c.label}
                title={c.label}
                onClick={() => set({ accent: c.id })}
                className="relative grid h-8 w-8 place-items-center rounded-full transition-transform hover:scale-110 active:scale-95"
                style={{ background: `linear-gradient(135deg, ${c.dark}, ${c.light})` }}
              >
                {active && (
                  <motion.span layoutId="accent-ring" className="absolute -inset-1 rounded-full ring-2 ring-fg/60" transition={springSnappy} />
                )}
                {active && <Check size={14} className="relative text-white" strokeWidth={3} />}
              </button>
            );
          })}
        </div>
      </Row>
      <Row label="Размытие стекла" hint="Слабее — быстрее на старых устройствах">
        <Segmented
          ariaLabel="Размытие"
          size="sm"
          value={a.blur}
          onChange={(v) => set({ blur: v })}
          options={[
            { value: 'low', label: 'Слабое' },
            { value: 'medium', label: 'Среднее' },
            { value: 'high', label: 'Сильное' },
          ]}
        />
      </Row>
      <Row label="Прозрачность карточек">
        <Segmented
          ariaLabel="Прозрачность карточек"
          size="sm"
          value={a.surface}
          onChange={(v) => set({ surface: v })}
          options={[
            { value: 'glass', label: 'Стекло' },
            { value: 'frosted', label: 'Матовое' },
            { value: 'solid', label: 'Плотное' },
          ]}
        />
      </Row>
      <Row label="Плотность интерфейса">
        <Segmented
          ariaLabel="Плотность"
          size="sm"
          value={a.density}
          onChange={(v) => set({ density: v })}
          options={[
            { value: 'comfortable', label: 'Свободно' },
            { value: 'compact', label: 'Компактно' },
          ]}
        />
      </Row>
      <Row label="Анимации" hint="Системная настройка «уменьшить движение» учитывается всегда">
        <Segmented
          ariaLabel="Уровень анимаций"
          size="sm"
          value={a.motion}
          onChange={(v) => set({ motion: v })}
          options={[
            { value: 'full', label: 'Все' },
            { value: 'reduced', label: 'Меньше' },
            { value: 'off', label: 'Выкл.' },
          ]}
        />
      </Row>
      <Row label="Стиль календаря">
        <Segmented
          ariaLabel="Стиль календаря"
          size="sm"
          value={a.calendarStyle}
          onChange={(v) => set({ calendarStyle: v })}
          options={[
            { value: 'tinted', label: 'Заливка' },
            { value: 'dots', label: 'Точки' },
            { value: 'rings', label: 'Кольца' },
          ]}
        />
      </Row>
    </div>
  );
}

export function DashboardSettings() {
  const widgets = useApp((s) => s.data.settings.appearance.dashboard);
  const move = (i: number, d: -1 | 1) => {
    const next = [...widgets];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x);
    actions.updateAppearance({ dashboard: next });
  };
  return (
    <ul className="space-y-1.5">
      {widgets.map((w, i) => (
        <motion.li layout key={w.widget} transition={springSnappy} className={cn('flex items-center gap-2 rounded-2xl bg-fill px-3 py-2', !w.visible && 'opacity-60')}>
          <span className="flex-1 text-sm text-fg">{WIDGET_LABEL[w.widget]}</span>
          <button type="button" aria-label={`${WIDGET_LABEL[w.widget]}: выше`} disabled={i === 0} onClick={() => move(i, -1)} className="grid h-8 w-8 place-items-center rounded-lg text-subtle hover:bg-fill-strong hover:text-fg disabled:opacity-25">
            <ChevronUp size={15} />
          </button>
          <button type="button" aria-label={`${WIDGET_LABEL[w.widget]}: ниже`} disabled={i === widgets.length - 1} onClick={() => move(i, 1)} className="grid h-8 w-8 place-items-center rounded-lg text-subtle hover:bg-fill-strong hover:text-fg disabled:opacity-25">
            <ChevronDown size={15} />
          </button>
          <Switch
            size="sm"
            checked={w.visible}
            onChange={(v) => actions.updateAppearance({ dashboard: widgets.map((x) => (x.widget === w.widget ? { ...x, visible: v } : x)) })}
            label={`Показывать: ${WIDGET_LABEL[w.widget]}`}
          />
        </motion.li>
      ))}
    </ul>
  );
}
