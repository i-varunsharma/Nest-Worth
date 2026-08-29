import { Link } from 'react-router-dom';

/*
  AuthLayout
  ----------
  The shared frame around both the login page and the signup page.

  On a wide screen it splits down the middle:
    left  - a dark panel with our logo and a short reminder of what Nestworth is
    right - the actual form

  On a phone the dark panel is hidden, because a small screen should get
  straight to the form instead of making people scroll past marketing.

  The pages pass in:
    title    - the big heading above the form
    subtitle - the smaller line under the heading
    points   - the short list shown on the dark panel
    children - the form itself
    footer   - the "no account yet?" line under the form
*/
export default function AuthLayout({ title, subtitle, points, children, footer }) {
  return (
    <div className="min-h-screen bg-paper lg:grid lg:grid-cols-2">

      {/* ---------- Left side: the dark brand panel ---------- */}
      <div className="relative hidden overflow-hidden bg-night text-paper lg:flex lg:flex-col lg:justify-between lg:p-12">

        {/* Two decorative layers. aria-hidden keeps them away from screen readers,
            because they carry no meaning, they are only there to add depth. */}
        <div className="grid-texture-dark pointer-events-none absolute inset-0" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -bottom-40 -left-24 h-[520px] w-[520px] rounded-full blur-3xl"
          style={{
            background:
              'radial-gradient(closest-side, rgba(31,83,64,0.55), rgba(169,124,44,0.16), transparent)',
          }}
          aria-hidden="true"
        />

        <Link to="/" className="relative flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-paper text-[13px] font-bold text-ink">
            N
          </span>
          <span className="font-display text-[21px] leading-none tracking-tight">Nestworth</span>
        </Link>

        <div className="relative">
          <h2 className="max-w-sm font-display text-[38px] leading-[1.08] tracking-[-0.02em]">
            Your net worth was never just yours.
          </h2>

          <ul className="mt-9 space-y-4">
            {points.map((point) => {
              return (
                <li key={point} className="flex items-start gap-3 text-[14.5px] text-paper/70">
                  <svg viewBox="0 0 16 16" className="mt-1 h-3.5 w-3.5 shrink-0 text-mint" aria-hidden="true">
                    <path
                      d="M3.5 8.4l3 3 6-6.6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {point}
                </li>
              );
            })}
          </ul>
        </div>

        <p className="relative text-2xs text-paper/40">
          Educational guidance, not regulated investment advice.
        </p>
      </div>

      {/* ---------- Right side: the form ---------- */}
      <div className="flex min-h-screen flex-col justify-center px-6 py-12 sm:px-10 lg:min-h-0 lg:px-16">
        <div className="mx-auto w-full max-w-[400px]">

          {/* The logo again, but only on small screens where the dark panel is hidden. */}
          <Link to="/" className="mb-10 flex items-center gap-2.5 lg:hidden">
            <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-ink text-[13px] font-bold text-paper">
              N
            </span>
            <span className="font-display text-[21px] leading-none tracking-tight">Nestworth</span>
          </Link>

          <h1 className="font-display text-[34px] leading-[1.1] tracking-[-0.02em]">{title}</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink2">{subtitle}</p>

          <div className="mt-9">{children}</div>

          <div className="mt-8 border-t border-line pt-6 text-[14px] text-muted">{footer}</div>
        </div>
      </div>
    </div>
  );
}
