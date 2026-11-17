import { Link } from 'react-router-dom';
import ThemeToggle from '../shared/ThemeToggle';

/*
  The thin bar with the logo and a way back home. Used by the login and signup
  screens and by the simple pages (privacy, terms, not found), so they all
  look the same.
*/
export default function SiteHeader() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-6 py-4 sm:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-ink text-[13px] font-bold text-paper">
            N
          </span>
          <span className="font-display text-[21px] leading-none tracking-tight">Nestworth</span>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="sweep text-[13.5px] font-medium text-muted transition-colors hover:text-ink"
          >
            Back to home
          </Link>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
