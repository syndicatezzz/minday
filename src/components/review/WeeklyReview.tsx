'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { habitIcon } from '@/components/habits/habit-icons';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Button } from '@/components/ui/Button';
import { TextArea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { ProgressBar } from '@/components/ui/Progress';
import { cn } from '@/lib/cn';
import { WEEKDAY_SHORT, addDays, formatKey, formatWeekday, startOfWeek, weekdayOf } from '@/lib/date';
import { feedback } from '@/lib/feedback';
import { habitRate } from '@/lib/habits/analytics';
import { colorOf } from '@/lib/habits/meta';
import { summarizeRange } from '@/lib/habits/schedule';
import { EASE_OUT, slide, springBouncy } from '@/lib/motion';
import { actions, useApp } from '@/lib/store/app-store';
import { useToday } from '@/lib/store/clock';
import { useStore } from '@/lib/store/create-store';
import { toast } from '@/lib/store/toast-store';
import { ui, uiStore } from '@/lib/store/ui-store';

const STEPS = ['Итоги', 'Привычки', 'Рефлексия'];
const RATINGS = ['Тяжёлая', 'Так себе', 'Нормально', 'Хорошая', 'Отличная'];

function weekLabel(ws: string) {
  const we = addDays(ws, 6);
  return `${formatKey(ws, { day: 'numeric', month: 'short' }).replace('.', '')} — ${formatKey(we, { day: 'numeric', month: 'short' }).replace('.', '')}`;
}

/** Интерактивный обзор недели: цифры, привычки и короткая рефлексия. */
export function WeeklyReview() {
  const open = useStore(uiStore, (s) => s.reviewOpen);
  const habitsMap = useApp((s) => s.data.habits);
  const entries = useApp((s) => s.data.entries);
  const reviews = useApp((s) => s.data.reviews);
  const ws = useApp((s) => s.data.settings.weekStartsOn);
  const { today } = useToday();

  const [weekStart, setWeekStart] = useState(() => startOfWeek(today, ws));
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [rating, setRating] = useState(0);
  const [wins, setWins] = useState('');
  const [improve, setImprove] = useState('');

  useEffect(() => {
    if (!open) return;
    setWeekStart(startOfWeek(today, ws));
    setStep(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    const r = reviews[weekStart];
    setRating(r?.rating ?? 0);
    setWins(r?.wins ?? '');
    setImprove(r?.improve ?? '');
  }, [weekStart, reviews]);

  const habits = useMemo(() => Object.values(habitsMap), [habitsMap]);
  const weekEnd = addDays(weekStart, 6);
  const days = useMemo(() => summarizeRange(habits, entries, weekStart, weekEnd, today, ws), [habits, entries, weekStart, weekEnd, today, ws]);
  const totals = days.reduce((a, d) => ({ c: a.c + d.completed, m: a.m + d.missed, s: a.s + d.scheduled }), { c: 0, m: 0, s: 0 });
  const rate = totals.c + totals.m ? Math.round((totals.c / (totals.c + totals.m)) * 100) : 0;
  const perfect = days.filter((d) => d.state === 'full').length;
  const best = [...days].filter((d) => d.scheduled > 0 && d.date <= today).sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0) || b.completed - a.completed)[0];
  const ranked = useMemo(
    () =>
      habits
        .map((h) => ({ habit: h, r: habitRate(h, entries, weekStart, weekEnd, today, ws) }))
        .filter((x) => x.r.scheduled > 0)
        .sort((a, b) => (b.r.rate ?? 0) - (a.r.rate ?? 0)),
    [habits, entries, weekStart, weekEnd, today, ws],
  );
  const max = Math.max(1, ...days.map((d) => d.scheduled));
  const isCurrent = weekStart === startOfWeek(today, ws);

  const go = (n: number) => {
    setDir(n > step ? 1 : -1);
    setStep(n);
  };

  const shiftWeek = (n: number) => {
    const next = addDays(weekStart, n * 7);
    if (next > today) return;
    setDir(n);
    setWeekStart(next);
  };

  const save = () => {
    actions.saveReview({ weekStart, rating, wins: wins.trim(), improve: improve.trim() });
    feedback.complete();
    toast({ title: 'Итоги недели сохранены', description: weekLabel(weekStart) });
    ui.setReview(false);
  };

  const anim = slide(dir, 36);

  return (
    <Modal
      open={open}
      onClose={() => ui.setReview(false)}
      size="lg"
      title={
        <span className="flex items-center gap-2">
          <Sparkles size={18} className="text-accent" /> Итоги недели
        </span>
      }
      description={
        <span className="inline-flex items-center gap-1">
          <button type="button" aria-label="Предыдущая неделя" onClick={() => shiftWeek(-1)} className="grid h-7 w-7 place-items-center rounded-lg hover:bg-fill">
            <ChevronLeft size={15} />
          </button>
          <span className="min-w-[132px] text-center tabular-nums">{weekLabel(weekStart)}</span>
          <button
            type="button"
            aria-label="Следующая неделя"
            disabled={isCurrent}
            onClick={() => shiftWeek(1)}
            className="grid h-7 w-7 place-items-center rounded-lg hover:bg-fill disabled:opacity-30"
          >
            <ChevronRight size={15} />
          </button>
          {isCurrent && <span className="hidden text-xs text-subtle sm:inline">· неделя ещё идёт</span>}
        </span>
      }
      footer={
        <>
          <div className="mr-auto hidden gap-1.5 sm:flex" aria-hidden>
            {STEPS.map((s, i) => (
              <motion.span
                key={s}
                className="h-1.5 rounded-full"
                animate={{ width: i === step ? 22 : 6, backgroundColor: i <= step ? 'var(--accent)' : 'var(--fill-strong)' }}
              />
            ))}
          </div>
          {step > 0 && (
            <Button variant="ghost" onClick={() => go(step - 1)}>
              <ArrowLeft size={16} /> Назад
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button variant="primary" onClick={() => go(step + 1)}>
              {STEPS[step + 1]} <ArrowRight size={16} />
            </Button>
          ) : (
            <Button variant="primary" onClick={save}>
              <Check size={16} /> Сохранить итоги
            </Button>
          )}
        </>
      }
    >
      <div className="relative min-h-[360px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={`${weekStart}-${step}`} initial={anim.initial} animate={anim.animate} exit={anim.exit}>
            {step === 0 && (
              <div>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { k: 'Выполнение', v: rate, s: '%', c: 'var(--accent)' },
                    { k: 'Отметок', v: totals.c, s: '', c: 'var(--success)' },
                    { k: 'Идеальных дней', v: perfect, s: '', c: 'var(--fg)' },
                  ].map((x) => (
                    <div key={x.k} className="rounded-2xl bg-fill px-3 py-3.5 sm:px-4">
                      <p className="text-[10.5px] font-medium tracking-wide text-subtle uppercase">{x.k}</p>
                      <p className="mt-1 text-[28px] leading-none font-semibold tracking-[-0.04em] tabular-nums" style={{ color: x.c }}>
                        <AnimatedNumber value={x.v} />
                        {x.s}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex h-36 items-end gap-2" role="list" aria-label="Выполнение по дням">
                  {days.map((d, i) => {
                    const h = d.scheduled ? (d.scheduled / max) * 100 : 6;
                    const fill = d.scheduled ? (d.completed / d.scheduled) * 100 : 0;
                    const isBest = best?.date === d.date;
                    return (
                      <div key={d.date} role="listitem" aria-label={`${formatWeekday(d.date)}: ${d.completed} из ${d.scheduled}`} className="flex h-full flex-1 flex-col items-center gap-2">
                        <div className="relative w-full flex-1">
                          <div className="absolute inset-x-0 bottom-0 overflow-hidden rounded-xl bg-fill-strong" style={{ height: `${h}%` }}>
                            <motion.div
                              className="absolute inset-x-0 bottom-0 origin-bottom rounded-xl"
                              style={{ height: `${fill}%`, background: d.state === 'full' ? 'var(--success)' : 'linear-gradient(180deg, var(--accent-2), var(--accent))' }}
                              initial={{ scaleY: 0 }}
                              animate={{ scaleY: 1 }}
                              transition={{ duration: 0.7, delay: 0.1 + i * 0.06, ease: EASE_OUT }}
                            />
                          </div>
                        </div>
                        <span className={cn('text-[11px]', isBest ? 'font-semibold text-accent' : 'text-subtle')}>{WEEKDAY_SHORT[weekdayOf(d.date)]}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-5 text-sm leading-relaxed text-muted">
                  {totals.s === 0
                    ? 'На этой неделе не было запланированных привычек.'
                    : best
                      ? `Лучший день — ${formatWeekday(best.date).toLowerCase()}: ${best.completed} из ${best.scheduled}. ${
                          totals.m ? `Пропусков за неделю: ${totals.m}.` : 'Ни одного пропуска — превосходно.'
                        }`
                      : 'Неделя только началась.'}
                </p>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                {ranked.length === 0 ? (
                  <p className="rounded-2xl bg-fill px-4 py-8 text-center text-sm text-muted">Нет данных по привычкам за эту неделю.</p>
                ) : (
                  <>
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {[
                        { title: 'Самая стабильная', item: ranked[0], Icon: TrendingUp, tone: 'text-success' },
                        { title: 'Нужно внимание', item: ranked[ranked.length - 1], Icon: TrendingDown, tone: 'text-warning' },
                      ].map(({ title, item, Icon, tone }) => {
                        const HIcon = habitIcon(item.habit.icon);
                        return (
                          <div key={title} className="rounded-2xl bg-fill p-4">
                            <p className={cn('flex items-center gap-1.5 text-[11px] font-semibold tracking-wide uppercase', tone)}>
                              <Icon size={13} /> {title}
                            </p>
                            <p className="mt-2.5 flex items-center gap-2 text-[15px] font-medium text-fg">
                              <HIcon size={16} style={{ color: colorOf(item.habit.color) }} />
                              <span className="truncate">{item.habit.name}</span>
                            </p>
                            <p className="mt-0.5 text-xs text-subtle">
                              {item.r.completed} из {item.r.scheduled} · {Math.round((item.r.rate ?? 0) * 100)}%
                            </p>
                          </div>
                        );
                      })}
                    </div>
                    <ul className="space-y-3">
                      {ranked.map(({ habit, r }, i) => (
                        <motion.li
                          key={habit.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04, duration: 0.35, ease: EASE_OUT }}
                        >
                          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                            <span className="truncate text-fg">{habit.name}</span>
                            <span className="shrink-0 text-xs text-subtle tabular-nums">
                              {r.completed}/{r.scheduled}
                            </span>
                          </div>
                          <ProgressBar value={r.rate ?? 0} color={colorOf(habit.color)} height={5} label={habit.name} />
                        </motion.li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <fieldset>
                  <legend className="mb-3 text-[13px] font-medium text-muted">Как прошла неделя?</legend>
                  <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Оценка недели">
                    {RATINGS.map((label, i) => {
                      const v = i + 1;
                      const active = rating === v;
                      return (
                        <motion.button
                          key={label}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => {
                            setRating(v);
                            feedback.tap();
                          }}
                          whileTap={{ scale: 0.92 }}
                          className={cn(
                            'relative flex flex-col items-center gap-1.5 rounded-2xl border px-1 py-3 text-[11px] transition-colors',
                            active ? 'border-accent/50 text-accent' : 'border-line bg-fill text-subtle hover:text-muted',
                          )}
                        >
                          {active && (
                            <motion.span layoutId="review-rating" className="absolute inset-0 rounded-2xl bg-accent/15" transition={springBouncy} />
                          )}
                          <span className="relative text-lg font-semibold tabular-nums">{v}</span>
                          <span className="relative leading-tight">{label}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </fieldset>
                <div>
                  <label htmlFor="review-wins" className="mb-2 block text-[13px] font-medium text-muted">
                    Что получилось?
                  </label>
                  <TextArea id="review-wins" rows={3} maxLength={1000} value={wins} onChange={(e) => setWins(e.target.value)} placeholder="Маленькие победы тоже считаются" />
                </div>
                <div>
                  <label htmlFor="review-improve" className="mb-2 block text-[13px] font-medium text-muted">
                    Что улучшить на следующей неделе?
                  </label>
                  <TextArea id="review-improve" rows={3} maxLength={1000} value={improve} onChange={(e) => setImprove(e.target.value)} placeholder="Одна конкретная вещь" />
                </div>
                {reviews[weekStart] && (
                  <p className="text-xs text-subtle">
                    Итоги этой недели уже сохранены — их можно дополнить
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </Modal>
  );
}
