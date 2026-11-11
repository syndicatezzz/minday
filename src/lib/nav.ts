import {
  Bell,
  BookHeart,
  CalendarDays,
  Crosshair,
  LayoutDashboard,
  ListChecks,
  Mountain,
  Settings,
  SunMedium,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  title: string;
  icon: LucideIcon;
  group: 'day' | 'growth' | 'system';
}

/**
 * Навигация сгруппирована, чтобы не перегружать меню:
 * «День» — ежедневная работа, «Рост» — долгосрочное, «Система» — управление.
 * Рутины живут внутри «Привычек», наблюдения — внутри «Аналитики».
 */
export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Сегодня', title: 'Dashboard', icon: LayoutDashboard, group: 'day' },
  { href: '/day', label: 'Мой день', title: 'My Day', icon: SunMedium, group: 'day' },
  { href: '/habits', label: 'Привычки', title: 'Habits & Routines', icon: ListChecks, group: 'day' },
  { href: '/calendar', label: 'Календарь', title: 'Calendar', icon: CalendarDays, group: 'day' },
  { href: '/goals', label: 'Цели', title: 'Goals', icon: Mountain, group: 'growth' },
  { href: '/focus', label: 'Фокус', title: 'Focus', icon: Crosshair, group: 'growth' },
  { href: '/journal', label: 'Дневник', title: 'Journal', icon: BookHeart, group: 'growth' },
  { href: '/analytics', label: 'Аналитика', title: 'Analytics & Insights', icon: TrendingUp, group: 'growth' },
  { href: '/reminders', label: 'Напоминания', title: 'Reminders', icon: Bell, group: 'system' },
  { href: '/settings', label: 'Настройки', title: 'Settings', icon: Settings, group: 'system' },
];

export const NAV_GROUPS: { id: NavItem['group']; label: string }[] = [
  { id: 'day', label: 'День' },
  { id: 'growth', label: 'Рост' },
  { id: 'system', label: 'Система' },
];

export function isActivePath(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}
