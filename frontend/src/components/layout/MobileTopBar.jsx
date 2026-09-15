import { Link } from 'react-router-dom';

/*
  The thin bar at the top on phones and tablets, where the sidebar is hidden.
  It has the logo and the button that slides the sidebar in. Hidden on large
  screens, where the sidebar is always showing.
*/

export default function MobileTopBar({ onOpenMenu }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur-xl lg:hidden">
      <div className="flex items-center justify-between px-6 py-3.5 sm:px-8">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-ink text-[13px] font-bold text-paper">
            N
          </span>
          <span className="font-display text-[21px] leading-none tracking-tight">Nestworth</span>
        </Link>

        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open menu"
          className="grid h-9 w-9 place-items-center rounded-full border border-line text-ink transition-colors hover:border-ink"
        >
          {/* Three short lines, the usual menu icon. */}
          <span aria-hidden="true" className="flex w-4 flex-col gap-[5px]">
            <span className="block h-px w-4 bg-current" />
            <span className="block h-px w-4 bg-current" />
            <span className="block h-px w-4 bg-current" />
          </span>
        </button>
      </div>
    </header>
  );
}
