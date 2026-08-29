import { Link, useNavigate } from 'react-router-dom';
import Container from '../shared/Container';
import { clearHousehold } from '../../lib/household';

/*
  AppBar
  ------
  The bar across the top of the signed-in pages.

  It is deliberately NOT the same component as the marketing Navbar. That one
  sells the product, with links that jump down the landing page. This one is for
  someone already using the product, so it holds sections and a sign-out button.

  They share the theme, so they still look like the same family: same logo, same
  colours, same hairline underneath.

  Props:
    name - the person's name, used for the little round avatar. May be empty.
*/

const sections = [
  { label: 'Plan', href: '#plan' },
  { label: 'Outflow', href: '#outflow' },
  { label: 'Future', href: '#future' },
];

export default function AppBar({ name }) {
  // useNavigate gives us a function that moves to another page in code, rather
  // than waiting for someone to click a link.
  const navigate = useNavigate();

  // The avatar shows the first letter of the name. With no name, use the logo
  // letter instead, so the circle is never empty.
  let initial = 'N';
  if (name && name.length > 0) {
    initial = name[0].toUpperCase();
  }

  const handleSignOut = () => {
    // With no real accounts yet, signing out just means forgetting the answers
    // and going back to the landing page.
    clearHousehold();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/85 backdrop-blur-xl">
      <Container>
        <nav className="flex items-center justify-between py-3.5">

          <Link to="/dashboard" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-ink text-[13px] font-bold text-paper">
              N
            </span>
            <span className="font-display text-[21px] leading-none tracking-tight">Nestworth</span>
          </Link>

          <div className="hidden items-center gap-9 md:flex">
            {sections.map((section) => {
              return (
                <a
                  key={section.href}
                  href={section.href}
                  className="sweep text-[14px] font-medium text-muted transition-colors duration-300 hover:text-ink"
                >
                  {section.label}
                </a>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSignOut}
              className="sweep text-[13.5px] font-medium text-muted transition-colors hover:text-ink"
            >
              Sign out
            </button>

            <span className="grid h-9 w-9 place-items-center rounded-full bg-accent text-[13px] font-semibold text-white">
              {initial}
            </span>
          </div>
        </nav>
      </Container>
    </header>
  );
}
