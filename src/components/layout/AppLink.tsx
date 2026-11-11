'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ComponentProps, MouseEvent } from 'react';
import { navigateWithTransition } from '@/lib/navigation';

type Props = Omit<ComponentProps<typeof Link>, 'href'> & { href: string };

/** Ссылка внутри приложения с плавным уходом текущей страницы. */
export function AppLink({ href, onClick, ...rest }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    if (href === pathname) return;
    navigateWithTransition(router, href);
  };

  return <Link href={href} onClick={handle} {...rest} />;
}
