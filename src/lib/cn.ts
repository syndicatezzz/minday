type ClassValue = string | number | false | null | undefined;

/** Минималистичный аналог clsx. */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ');
}
