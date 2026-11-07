import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="glass mx-auto mt-10 max-w-md rounded-[28px] px-6 py-14 text-center">
      <p className="text-[56px] leading-none font-semibold tracking-[-0.05em] text-fg">404</p>
      <h1 className="mt-3 text-lg font-semibold text-fg">Страница не найдена</h1>
      <p className="mt-1.5 text-sm text-muted">Возможно, ссылка устарела. Вернитесь к сегодняшним привычкам.</p>
      <Link
        href="/"
        className="mt-6 inline-flex h-11 items-center rounded-2xl bg-fg px-5 text-sm font-medium text-bg transition-transform active:scale-95"
      >
        На главную
      </Link>
    </div>
  );
}
