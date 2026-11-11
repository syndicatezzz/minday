'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Annoyed, BookHeart, Check, ChevronLeft, ChevronRight, Frown, Laugh, Meh, Search, Smile, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { CardHeader, GlassCard } from '@/components/ui/GlassCard';
import { inputClass, TextArea } from '@/components/ui/Field';
import { cn } from '@/lib/cn';
import { addDays, formatLongDate, formatWeekday, plural } from '@/lib/date';
import { MOODS, moodVsCompletion } from '@/lib/journal';
import { getDayItems, summarizeDay } from '@/lib/habits/schedule';
import { EASE_OUT, springBouncy, stagger } from '@/lib/motion';
import { actions, useApp } from '@/lib/store/app-store';
import { useToday } from '@/lib/store/clock';
import { toast } from '@/lib/store/toast-store';
import type { DateKey } from '@/types';

const MOOD_ICON = { 1: Frown, 2: Annoyed, 3: Meh, 4: Smile, 5: Laugh } as const;
const MOOD_COLOR = { 1: '#d47a86', 2: '#d9a35a', 3: '#9ba1b0', 4: '#62bd8c', 5: '#7aa7f0' } as const;

const PROMPTS = [
  'За что вы благодарны сегодня?',
  'Что сегодня получилось лучше, чем вчера?',
  'Что помогло — или помешало — привычкам?',
  'Какой один шаг сделаете завтра?',
  'Что сегодня принесло энергию?',
];

export default function JournalPage() {
  const journal = useApp((s) => s.data.journal);
  const habitsMap = useApp((s) => s.data.habits);
  const entries = useApp((s) => s.data.entries);
  const ws = useApp((s) => s.data.settings.weekStartsOn);
  const { today } = useToday();
  const [date, setDate] = useState<DateKey>(today);
  const current = journal[date];
  const [note, setNote] = useState(current?.note ?? '');
  const [reflection, setReflection] = useState(current?.reflection ?? '');
  const [saved, setSaved] = useState(true);
  const [query, setQuery] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setNote(journal[date]?.note ?? '');
    setReflection(journal[date]?.reflection ?? '');
    setSaved(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  // Автосохранение текста с небольшой задержкой
  const schedule = (patch: { note?: string; reflection?: string }) => {
    setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      actions.saveJournal(date, patch.note !== undefined ? { note: patch.note, reflection } : { reflection: patch.reflection ?? '', note });
      setSaved(true);
    }, 500);
  };
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const habits = useMemo(() => Object.values(habitsMap), [habitsMap]);
  const all = useMemo(() => Object.values(journal).sort((a, b) => b.date.localeCompare(a.date)), [journal]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? all.filter((j) => `${j.note} ${j.reflection}`.toLowerCase().includes(q)) : all;
  }, [all, query]);
  const correlation = useMemo(() => moodVsCompletion(all, habits, entries, today, ws), [all, habits, entries, today, ws]);
  const daySummary = summarizeDay(getDayItems(habits, entries, date, today, ws), date, today);
  const prompt = PROMPTS[Math.abs(date.split('-').reduce((a, x) => a + Number(x), 0)) % PROMPTS.length];
  const withMood = correlation.filter((c) => c.days > 0);

  return (
    <>
      <PageHeader eyebrow="Дневник" title="Несколько строк о дне" description="Настроение, заметка и короткая рефлексия. Всё хранится только на этом устройстве." />

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid gap-4 lg:grid-cols-12 lg:gap-5">
        <GlassCard className="p-5 sm:p-7 lg:col-span-7">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[13px] font-medium text-subtle">{formatWeekday(date)}</p>
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-fg">{date === today ? 'Сегодня' : formatLongDate(date)}</h2>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" aria-label="Предыдущий день" onClick={() => setDate(addDays(date, -1))}>
                <ChevronLeft size={18} />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label="Следующий день" disabled={date >= today} onClick={() => setDate(addDays(date, 1))}>
                <ChevronRight size={18} />
              </Button>
            </div>
          </div>

          <fieldset>
            <legend className="mb-3 text-[13px] font-medium text-muted">Настроение</legend>
            <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Настроение">
              {MOODS.map((m) => {
                const Icon = MOOD_ICON[m.value];
                const active = current?.mood === m.value;
                return (
                  <motion.button
                    key={m.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => actions.saveJournal(date, { mood: active ? 0 : m.value, note, reflection })}
                    className={cn('relative flex flex-col items-center gap-1.5 rounded-2xl border py-3 text-[11px] transition-colors', active ? 'border-transparent text-fg' : 'border-line bg-fill text-subtle hover:text-muted')}
                  >
                    {active && (
                      <motion.span
                        layoutId="mood-active"
                        className="absolute inset-0 rounded-2xl"
                        style={{ background: `color-mix(in oklab, ${MOOD_COLOR[m.value]} 18%, transparent)`, boxShadow: `inset 0 0 0 1.5px ${MOOD_COLOR[m.value]}` }}
                        transition={springBouncy}
                      />
                    )}
                    <Icon size={22} className="relative" style={{ color: active ? MOOD_COLOR[m.value] : undefined }} />
                    <span className="relative">{m.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-5 space-y-4">
            <div>
              <label htmlFor="j-note" className="mb-2 block text-[13px] font-medium text-muted">
                Заметка дня
              </label>
              <TextArea
                id="j-note"
                rows={4}
                maxLength={5000}
                value={note}
                placeholder="Что произошло, что запомнилось…"
                onChange={(e) => {
                  setNote(e.target.value);
                  schedule({ note: e.target.value });
                }}
              />
            </div>
            <div>
              <label htmlFor="j-refl" className="mb-2 block text-[13px] font-medium text-muted">
                {prompt}
              </label>
              <TextArea
                id="j-refl"
                rows={2}
                maxLength={2000}
                value={reflection}
                placeholder="Короткая рефлексия"
                onChange={(e) => {
                  setReflection(e.target.value);
                  schedule({ reflection: e.target.value });
                }}
              />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-subtle">
            <span>
              Привычки в этот день: {daySummary.completed}/{daySummary.scheduled}
            </span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={saved ? 's' : 'u'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="inline-flex items-center gap-1">
                {saved ? (
                  <>
                    <Check size={12} className="text-success" /> Сохранено
                  </>
                ) : (
                  'Сохранение…'
                )}
              </motion.span>
            </AnimatePresence>
          </div>
        </GlassCard>

        <GlassCard className="p-5 sm:p-6 lg:col-span-5">
          <CardHeader title="Настроение и привычки" subtitle="Средний процент выполнения в дни с каждой оценкой" className="mb-5" />
          {withMood.length < 2 ? (
            <p className="rounded-2xl bg-fill px-4 py-6 text-center text-sm text-muted">
              Отмечайте настроение несколько дней — здесь появится сопоставление с выполнением привычек.
            </p>
          ) : (
            <ul className="space-y-3">
              {correlation.map((c) => {
                const Icon = MOOD_ICON[c.mood as 1 | 2 | 3 | 4 | 5];
                return (
                  <li key={c.mood} className={cn(!c.days && 'opacity-40')}>
                    <div className="mb-1.5 flex items-center gap-2 text-sm">
                      <Icon size={15} style={{ color: MOOD_COLOR[c.mood as 1 | 2 | 3 | 4 | 5] }} />
                      <span className="flex-1 text-fg">{c.label}</span>
                      <span className="text-xs text-subtle tabular-nums">
                        {c.days} {plural(c.days, ['день', 'дня', 'дней'])} · <span className="font-semibold text-fg">{c.rate === null ? '—' : `${Math.round(c.rate * 100)}%`}</span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-fill-strong">
                      <motion.div
                        className="h-full origin-left rounded-full"
                        style={{ background: MOOD_COLOR[c.mood as 1 | 2 | 3 | 4 | 5], width: `${Math.round((c.rate ?? 0) * 100)}%` }}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.8, ease: EASE_OUT }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-4 text-[11.5px] leading-relaxed text-subtle">Это описательная статистика по вашим записям, а не вывод о причинах.</p>
        </GlassCard>

        <GlassCard className="p-5 sm:p-6 lg:col-span-12">
          <CardHeader title="История записей" subtitle={`${all.length} ${plural(all.length, ['запись', 'записи', 'записей'])}`} className="mb-4" />
          <div className="relative mb-4">
            <Search size={16} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-subtle" />
            <label htmlFor="j-search" className="sr-only">
              Поиск по записям
            </label>
            <input id="j-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск по записям" className={cn(inputClass, 'pl-11')} />
            {query && (
              <button type="button" aria-label="Очистить" onClick={() => setQuery('')} className="absolute top-1/2 right-2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-subtle hover:bg-fill">
                <X size={14} />
              </button>
            )}
          </div>
          {filtered.length === 0 ? (
            <p className="rounded-2xl bg-fill px-4 py-8 text-center text-sm text-muted">
              {all.length ? 'Ничего не найдено' : 'Записей пока нет — начните с сегодняшнего дня.'}
            </p>
          ) : (
            <ul className="grid gap-2.5 md:grid-cols-2">
              <AnimatePresence initial={false}>
                {filtered.slice(0, 60).map((j) => {
                  const Icon = j.mood ? MOOD_ICON[j.mood as 1 | 2 | 3 | 4 | 5] : BookHeart;
                  return (
                    <motion.li key={j.date} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}>
                      <div className={cn('group flex items-start gap-3 rounded-2xl border p-3.5 transition-colors', j.date === date ? 'border-accent/40 bg-accent/[0.06]' : 'border-line bg-fill hover:bg-fill-strong')}>
                        <button type="button" onClick={() => setDate(j.date)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                          <Icon size={18} className="mt-0.5 shrink-0" style={{ color: j.mood ? MOOD_COLOR[j.mood as 1 | 2 | 3 | 4 | 5] : 'var(--fg-subtle)' }} />
                          <span className="min-w-0">
                            <span className="block text-xs text-subtle">{formatLongDate(j.date)}</span>
                            <span className="mt-0.5 line-clamp-2 block text-sm text-fg">{j.note || j.reflection || 'Только настроение'}</span>
                          </span>
                        </button>
                        <button
                          type="button"
                          aria-label={`Удалить запись за ${formatLongDate(j.date)}`}
                          onClick={() => {
                            const removed = actions.deleteJournal(j.date);
                            if (j.date === date) {
                              setNote('');
                              setReflection('');
                            }
                            if (removed) toast({ title: 'Запись удалена', action: { label: 'Отменить', onClick: () => actions.restoreJournal(removed) } });
                          }}
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-subtle opacity-60 transition-opacity hover:bg-fill-strong hover:text-danger group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          )}
        </GlassCard>
      </motion.div>
    </>
  );
}
