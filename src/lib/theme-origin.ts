/** Точка, из которой раскрывается новая тема (последний клик по переключателю). */
let origin: { x: number; y: number } | null = null;

export function setThemeOrigin(x: number, y: number) {
  origin = { x, y };
}

export function takeThemeOrigin() {
  const o = origin;
  origin = null;
  return o;
}
