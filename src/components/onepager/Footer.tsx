import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-ink/10 bg-paper">
      <div className="mx-auto flex max-w-content flex-col items-center gap-6 px-6 py-14 text-center md:flex-row md:justify-between md:text-left">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="" aria-hidden="true" className="h-9 w-9" />
          <span className="font-display text-lg font-bold uppercase tracking-wide">
            Hermanos de Padel
          </span>
        </div>

        <p className="text-sm text-muted">
          Donauinsel, Wien · 11:00 – 16:00 Uhr · 2 Plätze
        </p>

        <div className="flex items-center gap-5 text-sm font-semibold">
          <Link
            to="/turnier"
            className="text-court underline-offset-4 transition-colors hover:underline"
          >
            Turnier-Ansicht
          </Link>
          <Link
            to="/admin"
            className="text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
          >
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
