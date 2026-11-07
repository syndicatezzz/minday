'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, CalendarDays, FlaskConical, Sparkles, Sprout, TrendingUp, Bell } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { LogoMark } from '@/components/layout/Logo';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/Field';
import { Portal } from '@/components/ui/Portal';
import { APP_CONFIG } from '@/config/app';
import { cn } from '@/lib/cn';
import { EASE_OUT } from '@/lib/motion';
import { actions, useApp } from '@/lib/store/app-store';
import { ui } from '@/lib/store/ui-store';

const FEATURES = [
  { Icon: Sparkles, title: 'Спокойный ритуал', text: 'Отмечайте привычки одним касанием' },
  { Icon: CalendarDays, title: 'Честный календарь', text: 'История выполнений и пропусков по дням' },
  { Icon: TrendingUp, title: 'Реальная аналитика', text: 'Серии и проценты по вашему расписанию' },
  { Icon: Bell, title: 'Напоминания', text: 'Уведомления в вашем часовом поясе' },
];

export function Onboarding() {
  const status = useApp((s) => s.status);
  const onboarded = useApp((s) => s.data.meta.onboarded);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [name, setName] = useState('');
  const [choice, setChoice] = useState<'clean' | 'demo'>('clean');
  const open = status === 'ready' && !onboarded;

  const go = (n: number) => {
    setDir(n > step ? 1 : -1);
    setStep(n);
  };

  const finish = (e?: FormEvent) => {
    e?.preventDefault();
    actions.completeOnboarding(name, choice === 'demo');
    if (choice === 'clean') window.setTimeout(() => ui.openHabitModal(), 450);
  };

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[65] grid place-items-center overflow-y-auto bg-bg/70 p-4 backdrop-blur-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.35 } }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Знакомство с приложением"
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: EASE_OUT } }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              className="glass-solid relative w-full max-w-[520px] overflow-hidden rounded-[32px] p-7 sm:p-10"
            >
              <div className="pointer-events-none absolute -top-24 -right-20 h-64 w-64 rounded-full bg-accent/25 blur-3xl" aria-hidden />
              <div className="pointer-events-none absolute -bottom-28 -left-16 h-64 w-64 rounded-full bg-accent-2/20 blur-3xl" aria-hidden />

              <div className="relative mb-8 flex items-center justify-between">
                <LogoMark size={40} />
                <div className="flex gap-1.5" aria-label={`Шаг ${step + 1} из 3`}>
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="h-1.5 rounded-full"
                      animate={{ width: i === step ? 22 : 6, backgroundColor: i <= step ? 'var(--accent)' : 'var(--fill-strong)' }}
                      transition={{ duration: 0.35 }}
                    />
                  ))}
                </div>
              </div>

              <div className="relative min-h-[360px]">
                <AnimatePresence mode="wait" custom={dir} initial={false}>
                  <motion.div
                    key={step}
                    custom={dir}
                    initial={{ opacity: 0, x: dir * 40 }}
                    animate={{ opacity: 1, x: 0, transition: { duration: 0.4, ease: EASE_OUT } }}
                    exit={{ opacity: 0, x: dir * -40, transition: { duration: 0.2 } }}
                  >
                    {step === 0 && (
                      <div>
                        <h2 className="text-[32px] leading-tight font-semibold tracking-[-0.035em] text-fg">
                          Добро пожаловать в <span className="tracking-[0.12em]">{APP_CONFIG.name}</span>
                        </h2>
                        <p className="mt-3 text-[15px] leading-relaxed text-muted">
                          Минималистичный трекер привычек: немного внимания каждый день — и дисциплина становится естественной.
                        </p>
                        <ul className="mt-7 grid gap-3 sm:grid-cols-2">
                          {FEATURES.map(({ Icon, title, text }) => (
                            <li key={title} className="glass-subtle rounded-2xl p-3.5">
                              <Icon size={17} className="text-accent" />
                              <p className="mt-2 text-sm font-medium text-fg">{title}</p>
                              <p className="mt-0.5 text-xs leading-snug text-subtle">{text}</p>
                            </li>
                          ))}
                        </ul>
                        <Button variant="primary" size="lg" className="mt-8 w-full" onClick={() => go(1)} data-autofocus>
                          Начать <ArrowRight size={17} />
                        </Button>
                      </div>
                    )}

                    {step === 1 && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          go(2);
                        }}
                      >
                        <h2 className="text-[28px] font-semibold tracking-[-0.03em] text-fg">Как к вам обращаться?</h2>
                        <p className="mt-2 text-[15px] text-muted">Имя увидите только вы — оно хранится на этом устройстве.</p>
                        <label htmlFor="onb-name" className="sr-only">
                          Ваше имя
                        </label>
                        <TextInput
                          id="onb-name"
                          autoFocus
                          className="mt-7 h-14 text-lg"
                          placeholder="Ваше имя"
                          maxLength={40}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                        <div className="mt-8 flex gap-2">
                          <Button variant="ghost" size="lg" onClick={() => go(0)}>
                            Назад
                          </Button>
                          <Button variant="primary" size="lg" type="submit" className="flex-1">
                            {name.trim() ? 'Продолжить' : 'Пропустить'} <ArrowRight size={17} />
                          </Button>
                        </div>
                      </form>
                    )}

                    {step === 2 && (
                      <form onSubmit={finish}>
                        <h2 className="text-[28px] font-semibold tracking-[-0.03em] text-fg">С чего начнём?</h2>
                        <p className="mt-2 text-[15px] text-muted">Демо-данные хранятся отдельно и никогда не смешиваются с вашими.</p>
                        <div className="mt-7 space-y-3" role="radiogroup" aria-label="Режим старта">
                          {(
                            [
                              { id: 'clean', Icon: Sprout, title: 'Чистый лист', text: 'Создам первую привычку сам' },
                              { id: 'demo', Icon: FlaskConical, title: 'Посмотреть демо', text: 'Примеры привычек с историей за 2–3 месяца. Выйти можно в любой момент' },
                            ] as const
                          ).map(({ id, Icon, title, text }) => {
                            const active = choice === id;
                            return (
                              <button
                                key={id}
                                type="button"
                                role="radio"
                                aria-checked={active}
                                onClick={() => setChoice(id)}
                                className={cn(
                                  'flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-all duration-200',
                                  active ? 'border-accent/50 bg-accent/10 shadow-[0_0_0_4px_color-mix(in_oklab,var(--accent)_10%,transparent)]' : 'border-line bg-fill hover:bg-fill-strong',
                                )}
                              >
                                <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', active ? 'bg-accent text-accent-fg' : 'bg-fill-strong text-muted')}>
                                  <Icon size={18} />
                                </span>
                                <span>
                                  <span className="block text-[15px] font-medium text-fg">{title}</span>
                                  <span className="mt-0.5 block text-[13px] leading-snug text-subtle">{text}</span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        <div className="mt-8 flex gap-2">
                          <Button variant="ghost" size="lg" onClick={() => go(1)}>
                            Назад
                          </Button>
                          <Button variant="primary" size="lg" type="submit" className="flex-1">
                            Готово <ArrowRight size={17} />
                          </Button>
                        </div>
                      </form>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
