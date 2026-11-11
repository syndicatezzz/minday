import { appStore } from '@/lib/store/app-store';

/*
 * Звук и тактильная отклика. Звуки синтезируются Web Audio API —
 * без файлов, очень тихо. Вибрация работает там, где поддерживается
 * navigator.vibrate (Android/Chrome; Safari на iOS её не поддерживает).
 */

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx ??= new AC();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, duration: number, gain = 0.035, type: OscillatorType = 'sine') {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + start;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export const sounds = {
  /** Мягкий двойной «тик» — отметка выполнения. */
  complete() {
    tone(880, 0, 0.18);
    tone(1318.5, 0.07, 0.26, 0.028);
  },
  /** Короткое восходящее арпеджио — все привычки дня выполнены. */
  allDone() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.09, 0.42, 0.03));
  },
  /** Колокольчик таймера. */
  timer() {
    [0, 0.45, 0.9].forEach((t) => {
      tone(1046.5, t, 0.7, 0.05, 'triangle');
      tone(1568, t + 0.01, 0.5, 0.02);
    });
  },
};

function vibrate(pattern: number | number[]) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}

export function hapticsSupported(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

/** Обратная связь с учётом пользовательских настроек. */
export const feedback = {
  complete() {
    const s = appStore.get().data.settings;
    if (s.soundEnabled) sounds.complete();
    if (s.hapticsEnabled) vibrate(12);
  },
  undo() {
    if (appStore.get().data.settings.hapticsEnabled) vibrate(6);
  },
  allDone() {
    const s = appStore.get().data.settings;
    if (s.soundEnabled) sounds.allDone();
    if (s.hapticsEnabled) vibrate([14, 60, 14, 60, 24]);
  },
  timer() {
    const s = appStore.get().data.settings;
    if (s.timerSound) sounds.timer();
    if (s.hapticsEnabled) vibrate([200, 100, 200]);
  },
  tap() {
    if (appStore.get().data.settings.hapticsEnabled) vibrate(8);
  },
};
