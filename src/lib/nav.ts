import { Bell, CalendarDays, LayoutDashboard, ListChecks, Settings, TrendingUp, type LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  title: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Сегодня', title: 'Dashboard', icon: LayoutDashboard },
  { href: '/habits', label: 'Привычки', title: 'Habits', icon: ListChecks },
  { href: '/calendar', label: 'Календарь', title: 'Calendar', icon: CalendarDays },
  { href: '/analytics', label: 'Аналитика', title: 'Analytics', icon: TrendingUp },
  { href: '/reminders', label: 'Напоминания', title: 'Reminders', icon: Bell },
  { href: '/settings', label: 'Настройки', title: 'Settings', icon: Settings },
];

export function isActivePath(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}
