'use client';

import { motion } from 'framer-motion';
import { Download, FlaskConical, Monitor, Moon, RotateCcw, Sun, Upload } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Avatar } from '@/components/layout/Avatar';
import { PageHeader } from '@/components/layout/PageHeader';
import { NotificationPermissionCard } from '@/components/reminders/NotificationPermissionCard';
import { Button } from '@/components/ui/Button';
import { Field, Select, TextInput } from '@/components/ui/Field';
import { Segmented } from '@/components/ui/Segmented';
import { Switch } from '@/components/ui/Switch';
import { APP_CONFIG } from '@/config/app';
import { deviceTimeZone, formatTime, zonedParts } from '@/lib/date';
import { fadeUp, stagger } from '@/lib/motion';
import { exportBackup } from '@/lib/backup';
import { CsvExport, InstallApp, Snapshots } from '@/components/settings/DataTools';
import { DashboardSettings, PersonalizationSettings } from '@/components/settings/Personalization';
import { hapticsSupported, sounds } from '@/lib/feedback';
import { actions, useApp } from '@/lib/store/app-store';
import { useToday } from '@/lib/store/clock';
import { toast } from '@/lib/store/toast-store';
import { ui } from '@/lib/store/ui-store';
import type { ThemePreference } from '@/types';

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <motion.section variants={fadeUp} className="glass rounded-[26px] p-5 sm:p-7" aria-label={title}>
      <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-fg">{title}</h2>
      {description && <p className="mt-1 text-[13px] text-muted">{description}</p>}
      <div className="mt-5 space-y-5">{children}</div>
    </motion.section>
  );
}

function Row({ label, hint, control, htmlFor }: { label: string; hint?: string; control: ReactNode; htmlFor?: string }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <label htmlFor={htmlFor} className="text-sm font-medium text-fg">
          {label}
        </label>
        {hint && <p className="mt-0.5 text-xs text-subtle">{hint}</p>}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

function timeZones(): string[] {
  try {
    const intl = Intl as unknown as { supportedValuesOf?: (k: string) => string[] };
    const list = intl.supportedValuesOf?.('timeZone');
    if (list?.length) return list;
  } catch {
    /* ignore */
  }
  return ['UTC', 'Europe/Moscow', 'Europe/Kaliningrad', 'Asia/Yekaterinburg', 'Asia/Omsk', 'Asia/Novosibirsk', 'Asia/Krasnoyarsk', 'Asia/Irkutsk', 'Asia/Vladivostok', 'Europe/London', 'America/New_York'];
}

function offsetLabel(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(new Date());
    return parts.find((p) => p.type === 'timeZoneName')?.value.replace('GMT', 'UTC') ?? '';
  } catch {
    return '';
  }
}

export default function SettingsPage() {
  const settings = useApp((s) => s.data.settings);
  const mode = useApp((s) => s.mode);
  const habitCount = useApp((s) => Object.keys(s.data.habits).length);
  const entryCount = useApp((s) => Object.keys(s.data.entries).length);
  const counts = { h: habitCount, e: entryCount };
  const { timeZone } = useToday();
  const [name, setName] = useState(settings.userName);
  const fileRef = useRef<HTMLInputElement>(null);
  const zones = useMemo(timeZones, []);
  const [hapticsOk, setHapticsOk] = useState(true);
  useEffect(() => setHapticsOk(hapticsSupported()), []);

  useEffect(() => setName(settings.userName), [settings.userName]);

  const saveName = () => {
    const v = name.trim().slice(0, 40);
    if (v === settings.userName) return;
    actions.updateSettings({ userName: v });
    toast({ title: 'Имя сохранено' });
  };

  const importFile = async (file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      toast({ tone: 'error', title: 'Файл слишком большой' });
      return;
    }
    let json: unknown;
    try {
      json = JSON.parse(await file.text());
    } catch {
      toast({ tone: 'error', title: 'Не удалось прочитать файл', description: 'Это не корректный JSON' });
      return;
    }
    const ok = await ui.confirm({
      title: 'Импортировать данные?',
      description: 'Текущие привычки, история и настройки будут заменены данными из файла. Рекомендуем сначала сделать экспорт.',
      confirmLabel: 'Импортировать',
      tone: 'danger',
    });
    if (ok !== true) return;
    try {
      const r = await actions.importData(json);
      toast({ title: 'Данные импортированы', description: `Привычек: ${r.habits}, отметок: ${r.entries}` });
    } catch (e) {
      toast({ tone: 'error', title: 'Импорт не выполнен', description: e instanceof Error ? e.message : 'Неизвестная ошибка' });
    }
  };

  const reset = async () => {
    const ok = await ui.confirm({
      title: 'Удалить все данные?',
      description: 'Все привычки, история выполнений, напоминания и настройки будут удалены с этого устройства. Действие нельзя отменить.',
      confirmLabel: 'Удалить всё',
      tone: 'danger',
    });
    if (ok !== true) return;
    await actions.resetAll();
    toast({ title: 'Данные удалены', description: 'Можно начать с чистого листа' });
  };

  const now = zonedParts(new Date(), timeZone);
  const nowStr = formatTime(`${String(now.hour).padStart(2, '0')}:${String(now.minute).padStart(2, '0')}`, settings.timeFormat);

  return (
    <>
      <PageHeader eyebrow="Настройки" title="Под ваш ритм" description="Все изменения сохраняются автоматически на этом устройстве." />

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        <div className="space-y-4 lg:space-y-5">
          <Section title="Профиль">
            <div className="flex items-center gap-4">
              <Avatar name={name || 'Гость'} size={56} />
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-fg">{name.trim() || 'Гость'}</p>
                <p className="text-xs text-subtle">Аватар строится из инициалов</p>
              </div>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveName();
              }}
              className="flex gap-2"
            >
              <div className="flex-1">
                <label htmlFor="set-name" className="sr-only">
                  Имя
                </label>
                <TextInput id="set-name" value={name} maxLength={40} placeholder="Ваше имя" onChange={(e) => setName(e.target.value)} onBlur={saveName} />
              </div>
              <Button type="submit" variant="subtle" className="h-12" disabled={name.trim() === settings.userName}>
                Сохранить
              </Button>
            </form>
          </Section>

          <Section title="Внешний вид">
            <Segmented<ThemePreference>
              ariaLabel="Тема"
              stretch
              value={settings.theme}
              onChange={(v) => actions.updateSettings({ theme: v })}
              options={[
                { value: 'dark', label: 'Тёмная', icon: <Moon size={14} /> },
                { value: 'light', label: 'Светлая', icon: <Sun size={14} /> },
                { value: 'system', label: 'Системная', icon: <Monitor size={14} /> },
              ]}
            />
          </Section>

          <Section title="Персонализация" description="Оформление сохраняется на этом устройстве">
            <PersonalizationSettings />
          </Section>

          <Section title="Главная страница" description="Какие блоки показывать справа и в каком порядке">
            <DashboardSettings />
          </Section>

          <Section title="Время и календарь" description={`Сейчас ${nowStr} · ${timeZone}`}>
            <Field label="Часовой пояс" htmlFor="set-tz" hint={`Автоматически определён: ${deviceTimeZone()}`}>
              <Select id="set-tz" value={settings.timeZone} onChange={(e) => actions.updateSettings({ timeZone: e.target.value })}>
                <option value="auto">Автоматически ({deviceTimeZone()})</option>
                {zones.map((z) => (
                  <option key={z} value={z}>
                    {z.replace(/_/g, ' ')} {offsetLabel(z)}
                  </option>
                ))}
              </Select>
            </Field>
            <Row
              label="Формат времени"
              control={
                <Segmented
                  ariaLabel="Формат времени"
                  size="sm"
                  value={settings.timeFormat}
                  onChange={(v) => actions.updateSettings({ timeFormat: v })}
                  options={[
                    { value: '24h', label: '24 часа' },
                    { value: '12h', label: '12 часов' },
                  ]}
                />
              }
            />
            <Row
              label="Первый день недели"
              control={
                <Segmented
                  ariaLabel="Первый день недели"
                  size="sm"
                  value={String(settings.weekStartsOn) as '0' | '1'}
                  onChange={(v) => actions.updateSettings({ weekStartsOn: v === '0' ? 0 : 1 })}
                  options={[
                    { value: '1', label: 'Понедельник' },
                    { value: '0', label: 'Воскресенье' },
                  ]}
                />
              }
            />
            <Row
              label="Начало нового дня"
              htmlFor="set-daystart"
              hint="Для «сов»: отметки до этого часа относятся к предыдущему дню"
              control={
                <div className="w-36">
                  <Select
                    id="set-daystart"
                    value={settings.dayStartHour}
                    onChange={(e) => actions.updateSettings({ dayStartHour: Number(e.target.value) })}
                    className="h-11"
                  >
                    {[0, 1, 2, 3, 4, 5].map((h) => (
                      <option key={h} value={h}>
                        {h === 0 ? 'Полночь' : formatTime(`0${h}:00`, settings.timeFormat)}
                      </option>
                    ))}
                  </Select>
                </div>
              }
            />
          </Section>
        </div>

        <div className="space-y-4 lg:space-y-5">
          <motion.div variants={fadeUp}>
            <NotificationPermissionCard />
          </motion.div>

          <Section title="Напоминания">
            <Row
              label="Не напоминать о выполненном"
              hint="Если привычка уже отмечена, напоминание не придёт"
              control={
                <Switch
                  checked={settings.skipCompletedReminders}
                  onChange={(v) => actions.updateSettings({ skipCompletedReminders: v })}
                  label="Не напоминать о выполненном"
                />
              }
            />
            <Row
              label="Показывать внутри приложения"
              hint="Всплывающая карточка с кнопкой «Выполнено»"
              control={
                <Switch checked={settings.inAppReminders} onChange={(v) => actions.updateSettings({ inAppReminders: v })} label="Показывать внутри приложения" />
              }
            />
          </Section>

          <Section title="Звук и отклик" description="Деликатная обратная связь при отметке привычек">
            <Row
              label="Звук выполнения"
              hint="Очень тихий двойной сигнал при отметке"
              control={
                <div className="flex items-center gap-2">
                  {settings.soundEnabled && (
                    <Button size="sm" variant="ghost" onClick={() => sounds.complete()}>
                      Прослушать
                    </Button>
                  )}
                  <Switch checked={settings.soundEnabled} onChange={(v) => {
                    actions.updateSettings({ soundEnabled: v });
                    if (v) sounds.complete();
                  }} label="Звук выполнения" />
                </div>
              }
            />
            <Row
              label="Тактильная отдача"
              hint={hapticsOk ? 'Лёгкая вибрация на телефоне' : 'Этот браузер не поддерживает вибрацию (например, Safari на iPhone)'}
              control={
                <Switch
                  checked={settings.hapticsEnabled}
                  disabled={!hapticsOk}
                  onChange={(v) => actions.updateSettings({ hapticsEnabled: v })}
                  label="Тактильная отдача"
                />
              }
            />
            <Row
              label="Сигнал таймера"
              hint="Мягкий колокольчик по окончании таймера"
              control={
                <div className="flex items-center gap-2">
                  {settings.timerSound && (
                    <Button size="sm" variant="ghost" onClick={() => sounds.timer()}>
                      Прослушать
                    </Button>
                  )}
                  <Switch checked={settings.timerSound} onChange={(v) => actions.updateSettings({ timerSound: v })} label="Сигнал таймера" />
                </div>
              }
            />
          </Section>

          <Section
            title="Данные"
            description={`Хранятся локально в браузере · ${counts.h} привычек, ${counts.e} отметок${mode === 'demo' ? ' (демо)' : ''}`}
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="subtle" onClick={exportBackup}>
                <Download size={16} /> Экспорт в JSON
              </Button>
              <Button variant="subtle" onClick={() => fileRef.current?.click()}>
                <Upload size={16} /> Импорт из JSON
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                aria-hidden
                tabIndex={-1}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) void importFile(f);
                }}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-fg">Таблицы CSV</p>
              <CsvExport />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-fg">Автоматические копии</p>
              <Snapshots />
            </div>
            {mode === 'real' ? (
              <Row
                label="Демо-режим"
                hint="Посмотреть приложение на примерах. Ваши данные не затрагиваются"
                control={
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await actions.enterDemo();
                      toast({ title: 'Демо-режим включён', description: 'Выйти можно из баннера вверху страницы' });
                    }}
                  >
                    <FlaskConical size={15} /> Открыть демо
                  </Button>
                }
              />
            ) : null}
            <div className="rounded-2xl border border-danger/20 bg-danger/[0.05] p-4">
              <Row
                label="Сбросить все данные"
                hint="Удалит привычки, историю и настройки"
                control={
                  <Button size="sm" variant="danger" onClick={() => void reset()}>
                    <RotateCcw size={14} /> Сбросить
                  </Button>
                }
              />
            </div>
          </Section>

          <Section title="Приложение и офлайн">
            <InstallApp />
          </Section>

          <motion.p variants={fadeUp} className="px-2 text-center text-xs text-subtle">
            {APP_CONFIG.name} · версия 2.0 · данные не покидают ваше устройство, облачной синхронизации пока нет
          </motion.p>
        </div>
      </motion.div>
    </>
  );
}
