import { Link } from 'react-router-dom';
import ThemeToggle from '../shared/ThemeToggle';

/*
  The frame around the login and signup screens: logo, one narrow column for the
  form, and small print. Plain, so nothing stands between the person and the form.

  Props:
    title, subtitle  the heading and the line under it
    children         the form
    footer           the line under the form
*/
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen flex-col bg-paper">

      {/* ---------- A thin bar, just so there is a way back ---------- */}
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

      {/* ---------- The form, centred ---------- */}
      {/* flex-1 makes this section take all the leftover height, which is what
          keeps the form in the middle on a tall screen and lets it scroll
          normally on a short one. */}
      <main className="flex flex-1 items-center justify-center px-6 py-14">
        <div className="w-full max-w-[380px]">

          <h1 className="font-display text-[32px] leading-[1.12] tracking-[-0.02em]">
            {title}
          </h1>
          <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink2">{subtitle}</p>

          <div className="mt-8">{children}</div>

          <div className="mt-7 border-t border-line pt-6 text-[13.5px] text-muted">
            {footer}
          </div>
        </div>
      </main>

      <footer className="border-t border-line px-6 py-5">
        <p className="mx-auto max-w-[1180px] text-2xs text-muted">
          Educational guidance, not regulated investment advice.
        </p>
      </footer>
    </div>
  );
}
