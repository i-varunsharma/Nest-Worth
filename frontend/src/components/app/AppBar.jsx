import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import Container from '../shared/Container';
import ThemeToggle from '../shared/ThemeToggle';
import * as api from '../../lib/api';

/*
  The bar across the top of every signed-in page.

  It is deliberately NOT the same component as the marketing Navbar. That one
  sells the product, with links that jump down the landing page. This one is for
  somebody already using the product, so it holds the sections of the app.

  NavLink instead of Link is the whole trick here. It works exactly like a link,
  but it also knows whether its address is the one currently open, and hands
  that to us as isActive. That is how the current section stays underlined
  without any page having to say which one it is.
*/

const sections = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/plans', label: 'Plans' },
  { to: '/debts', label: 'Debts' },
  { to: '/goals', label: 'Goals' },
  { to: '/net-worth', label: 'Net worth' },
  { to: '/spending', label: 'Spending' },
  { to: '/check-in', label: 'Check in' },
  { to: '/recap', label: 'Your year' },
];

export default function AppBar({ name }) {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // The avatar shows the first letter of the name. With no name, use the logo
  // letter instead, so the circle is never empty.
  let initial = 'N';
  if (name && name.length > 0) {
    initial = name[0].toUpperCase();
  }

  const handleSignOut = async () => {
    // The server deletes the session row and clears the cookie. Doing it there
    // rather than just forgetting the cookie here is what makes the sign-out
    // real: the old token stops working even if somebody copied it.
    await api.logout();
    navigate('/');
  };

  /*
    Works out the classes for one navigation link.

    NavLink calls this with { isActive }, so we get told which link is the
    current page rather than having to work it out.
  */
  const linkClasses = ({ isActive }) => {
    const base = 'text-[14px] font-medium transition-colors duration-300 ';

    if (isActive === true) {
      return base + 'text-ink';
    }

    return base + 'text-muted hover:text-ink';
  };

  const mobileLinkClasses = ({ isActive }) => {
    const base = 'rounded-xl px-3 py-3 text-[15px] font-medium transition-colors ';

    if (isActive === true) {
      return base + 'bg-paperDeep text-ink';
    }

    return base + 'text-ink2 hover:bg-paperDeep hover:text-ink';
  };

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/85 backdrop-blur-xl">
      <Container>
        <nav className="flex items-center justify-between py-3.5">

          <Link to="/dashboard" className="flex shrink-0 items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-ink text-[13px] font-bold text-paper">
              N
            </span>
            <span className="font-display text-[21px] leading-none tracking-tight">Nestworth</span>
          </Link>

          {/* The sections. Hidden on phones, where they move into the menu. */}
          <div className="hidden items-center gap-7 lg:flex">
            {sections.map((section) => {
              return (
                <NavLink key={section.to} to={section.to} className={linkClasses}>
                  {section.label}
                </NavLink>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/settings"
              className="sweep hidden text-[13.5px] font-medium text-muted transition-colors hover:text-ink sm:block"
            >
              Settings
            </Link>

            <button
              type="button"
              onClick={handleSignOut}
              className="sweep hidden text-[13.5px] font-medium text-muted transition-colors hover:text-ink sm:block"
            >
              Sign out
            </button>

            <ThemeToggle />

            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-[13px] font-semibold text-paper">
              {initial}
            </span>

            {/* The menu button, only on smaller screens. */}
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMenuOpen}
              className="grid h-9 w-9 place-items-center rounded-full border border-line text-ink transition-colors hover:border-ink lg:hidden"
            >
              <span className="relative block h-3 w-4">
                <span
                  className={
                    'absolute left-0 block h-px w-4 bg-current transition-all duration-300 ease-smooth '
                    + (isMenuOpen ? 'top-1.5 rotate-45' : 'top-0')
                  }
                />
                <span
                  className={
                    'absolute left-0 top-1.5 block h-px w-4 bg-current transition-opacity duration-200 '
                    + (isMenuOpen ? 'opacity-0' : 'opacity-100')
                  }
                />
                <span
                  className={
                    'absolute left-0 block h-px w-4 bg-current transition-all duration-300 ease-smooth '
                    + (isMenuOpen ? 'top-1.5 -rotate-45' : 'top-3')
                  }
                />
              </span>
            </button>
          </div>
        </nav>
      </Container>

      {/* The phone menu. It grows from zero height rather than appearing, which
          is why it needs overflow-hidden and a maximum height. */}
      <div
        className={
          'overflow-hidden border-t border-line bg-paper/95 backdrop-blur-xl '
          + 'transition-[max-height,opacity] duration-500 ease-smooth lg:hidden '
          + (isMenuOpen ? 'max-h-[28rem] opacity-100' : 'max-h-0 opacity-0')
        }
      >
        <Container className="flex flex-col gap-1 py-4">
          {sections.map((section) => {
            return (
              <NavLink
                key={section.to}
                to={section.to}
                onClick={() => setIsMenuOpen(false)}
                className={mobileLinkClasses}
              >
                {section.label}
              </NavLink>
            );
          })}

          <NavLink
            to="/settings"
            onClick={() => setIsMenuOpen(false)}
            className={mobileLinkClasses}
          >
            Settings
          </NavLink>

          <button
            type="button"
            onClick={handleSignOut}
            className="mt-1 rounded-xl px-3 py-3 text-left text-[15px] font-medium text-muted transition-colors hover:bg-paperDeep hover:text-ink"
          >
            Sign out
          </button>
        </Container>
      </div>
    </header>
  );
}
