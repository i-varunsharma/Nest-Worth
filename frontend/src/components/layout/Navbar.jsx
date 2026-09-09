import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Container from '../shared/Container';
import ThemeToggle from '../shared/ThemeToggle';

/*
  The bar across the top of the landing page.

  Two things make it feel alive:
    1. It sticks to the top as you scroll, and once you have scrolled a little it
       gains a frosted background and a hairline, so text never runs underneath it.
    2. On a phone the links collapse into a menu behind the button on the right.
*/

const menuLinks = [
  { href: '#household', label: 'The problem' },
  { href: '#how', label: 'How it works' },
  { href: '#difference', label: 'Why Nestworth' },
  { href: '#questions', label: 'Questions' },
];

export default function Navbar() {
  // Has the reader scrolled down at all?
  const [hasScrolled, setHasScrolled] = useState(false);

  // Is the phone menu open?
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Watch the scroll position. The empty [] at the end means "set this up once
  // when the navbar first appears", not on every render.
  useEffect(() => {
    const handleScroll = () => {
      setHasScrolled(window.scrollY > 12);
    };

    handleScroll(); // check once straight away, in case the page loads part-scrolled
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Always remove a listener you added, or it keeps running after the
    // component is gone.
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // While the phone menu is open, stop the page behind it from scrolling.
  useEffect(() => {
    if (isMenuOpen === true) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  // ---- Work out the classes that change, before the JSX below ----

  let headerClasses = 'sticky top-0 z-50 transition-all duration-500 ease-smooth ';
  if (hasScrolled === true) {
    headerClasses = headerClasses + 'border-b border-line/80 bg-paper/85 backdrop-blur-xl';
  } else {
    headerClasses = headerClasses + 'border-b border-transparent bg-transparent';
  }

  // The bar gets slightly shorter once you start scrolling.
  let navClasses = 'flex items-center justify-between transition-all duration-500 ease-smooth ';
  if (hasScrolled === true) {
    navClasses = navClasses + 'py-3.5';
  } else {
    navClasses = navClasses + 'py-5';
  }

  // The phone menu slides open by growing its maximum height from zero.
  let mobileMenuClasses =
    'overflow-hidden border-t border-line bg-paper/95 backdrop-blur-xl '
    + 'transition-[max-height,opacity] duration-500 ease-smooth md:hidden ';
  if (isMenuOpen === true) {
    mobileMenuClasses = mobileMenuClasses + 'max-h-96 opacity-100';
  } else {
    mobileMenuClasses = mobileMenuClasses + 'max-h-0 opacity-0';
  }

  let menuButtonLabel = 'Open menu';
  if (isMenuOpen === true) {
    menuButtonLabel = 'Close menu';
  }

  // The three bars of the menu icon. When the menu is open the top and bottom
  // bars rotate into an X and the middle one fades away.
  let topBarClasses = 'absolute left-0 block h-px w-4 bg-current transition-all duration-300 ease-smooth ';
  let middleBarClasses = 'absolute left-0 top-1.5 block h-px w-4 bg-current transition-opacity duration-200 ';
  let bottomBarClasses = 'absolute left-0 block h-px w-4 bg-current transition-all duration-300 ease-smooth ';

  if (isMenuOpen === true) {
    topBarClasses = topBarClasses + 'top-1.5 rotate-45';
    middleBarClasses = middleBarClasses + 'opacity-0';
    bottomBarClasses = bottomBarClasses + 'top-1.5 -rotate-45';
  } else {
    topBarClasses = topBarClasses + 'top-0';
    middleBarClasses = middleBarClasses + 'opacity-100';
    bottomBarClasses = bottomBarClasses + 'top-3';
  }

  return (
    <header className={headerClasses}>
      <Container>
        <nav className={navClasses}>

          {/* Logo */}
          <Link to="/" className="group flex items-center gap-2.5" onClick={() => setIsMenuOpen(false)}>
            <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-ink text-[13px] font-bold text-paper transition-colors duration-300 group-hover:bg-accent">
              N
            </span>
            <span className="font-display text-[21px] leading-none tracking-tight">Nestworth</span>
          </Link>

          {/* Links. "hidden md:flex" means hidden on phones, shown from medium screens up. */}
          <div className="hidden items-center gap-9 md:flex">
            {menuLinks.map((link) => {
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className="sweep text-[14px] font-medium text-muted transition-colors duration-300 hover:text-ink"
                >
                  {link.label}
                </a>
              );
            })}
          </div>

          {/* Sign in, sign up, and the phone menu button */}
          <div className="flex items-center gap-2.5">
            <ThemeToggle className="mr-1" />

            <Link to="/login" className="sweep hidden text-[14px] font-medium text-muted transition-colors hover:text-ink sm:block">
              Log in
            </Link>

            <Link
              to="/signup"
              className="group hidden items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[13.5px] font-semibold text-paper transition-all duration-300 ease-smooth hover:bg-accent hover:shadow-card sm:inline-flex"
            >
              Start free
              <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-0.5">
                &#8594;
              </span>
            </Link>

            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={menuButtonLabel}
              aria-expanded={isMenuOpen}
              className="grid h-10 w-10 place-items-center rounded-full border border-line text-ink transition-colors hover:border-ink md:hidden"
            >
              <span className="relative block h-3 w-4">
                <span className={topBarClasses} />
                <span className={middleBarClasses} />
                <span className={bottomBarClasses} />
              </span>
            </button>
          </div>
        </nav>
      </Container>

      {/* The phone menu, which lives below the bar and is empty-looking when closed. */}
      <div className={mobileMenuClasses}>
        <Container className="flex flex-col gap-1 py-4">
          {menuLinks.map((link) => {
            return (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className="rounded-xl px-3 py-3 text-[15px] font-medium text-ink2 transition-colors hover:bg-paperDeep hover:text-ink"
              >
                {link.label}
              </a>
            );
          })}

          <Link
            to="/signup"
            onClick={() => setIsMenuOpen(false)}
            className="mt-2 rounded-full bg-ink px-5 py-3 text-center text-[14px] font-semibold text-paper"
          >
            Start free
          </Link>
        </Container>
      </div>
    </header>
  );
}
