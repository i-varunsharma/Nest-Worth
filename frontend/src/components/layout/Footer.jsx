import { Link } from 'react-router-dom';
import Container from '../shared/Container';

// The landing page footer. href links jump within this page; to links go to another
// page through the router, without a full reload.
const linkColumns = [
  {
    title: 'Product',
    links: [
      { label: 'How it works', href: '#how' },
      { label: 'Why Nestworth', href: '#difference' },
      { label: 'Your projection', href: '#future' },
      { label: 'Questions', href: '#questions' },
    ],
  },
  {
    title: 'The app',
    links: [
      { label: 'Dashboard', to: '/dashboard' },
      { label: 'Debts', to: '/debts' },
      { label: 'Goals', to: '/goals' },
      { label: 'Net worth', to: '/net-worth' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Create an account', to: '/signup' },
      { label: 'Sign in', to: '/login' },
      { label: 'What we do with your data', href: '#questions' },
    ],
  },
];

// The same styling for both kinds of link, so they cannot drift apart.
const linkClasses = 'sweep text-[13.5px] text-ink2 transition-colors hover:text-ink';

export default function Footer() {
  // Shows the current year, so nobody has to remember to update it in January.
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-line bg-paper">
      <Container className="py-16">

        {/* One wide column for the logo, then three narrower ones for the links. */}
        <div className="grid gap-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">

          <div>
            <Link to="/" className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-ink text-[13px] font-bold text-paper">
                N
              </span>
              <span className="font-display text-[21px] leading-none tracking-tight">Nestworth</span>
            </Link>

            <p className="mt-4 max-w-xs text-[13.5px] leading-relaxed text-muted">
              A finance tool that reads your household before it reads your salary.
            </p>
          </div>

          {linkColumns.map((column) => {
            return (
              <div key={column.title}>
                <h4 className="text-2xs font-semibold uppercase tracking-widest2 text-muted">
                  {column.title}
                </h4>

                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => {
                    /*
                      A link to another page has to use Link, or the browser
                      reloads the whole app instead of switching pages. A link
                      to a section on this page is an ordinary anchor.
                    */
                    let element = null;

                    if (link.to) {
                      element = (
                        <Link to={link.to} className={linkClasses}>
                          {link.label}
                        </Link>
                      );
                    } else {
                      element = (
                        <a href={link.href} className={linkClasses}>
                          {link.label}
                        </a>
                      );
                    }

                    return <li key={link.label}>{element}</li>;
                  })}
                </ul>
              </div>
            );
          })}
        </div>

        {/* The small print, split left and right on wider screens. */}
        <div className="mt-14 flex flex-col gap-3 border-t border-line pt-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12.5px] text-muted">
            &copy; {currentYear} Nestworth. Built with care for how Indian households actually share money.
          </p>
          <p className="text-[12.5px] text-muted">
            Educational guidance, not regulated investment advice.
          </p>
        </div>
      </Container>
    </footer>
  );
}
