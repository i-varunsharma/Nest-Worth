import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Container from '../shared/Container';

const links = [
  { href: '#household', label: 'The problem' },
  { href: '#how', label: 'How it works' },
  { href: '#difference', label: 'Why Nestworth' },
  { href: '#questions', label: 'Questions' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-500 ease-smooth ${
        scrolled ? 'border-b border-line/80 bg-paper/85 backdrop-blur-xl' : 'border-b border-transparent bg-transparent'
      }`}
    >
      <Container>
        <nav className={`flex items-center justify-between transition-all duration-500 ease-smooth ${scrolled ? 'py-3.5' : 'py-5'}`}>
          <Link to="/" className="group flex items-center gap-2.5" onClick={() => setOpen(false)}>
            <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-ink text-[13px] font-bold text-paper transition-colors duration-300 group-hover:bg-accent">
              N
            </span>
            <span className="font-display text-[21px] leading-none tracking-tight">Nestworth</span>
          </Link>

          <div className="hidden items-center gap-9 md:flex">
            {links.map((link) => (
              <a key={link.href} href={link.href} className="sweep text-[14px] font-medium text-muted transition-colors duration-300 hover:text-ink">
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2.5">
            <Link to="/login" className="sweep hidden text-[14px] font-medium text-muted transition-colors hover:text-ink sm:block">
              Log in
            </Link>
            <Link
              to="/signup"
              className="group hidden items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[13.5px] font-semibold text-paper transition-all duration-300 ease-smooth hover:bg-accent hover:shadow-card sm:inline-flex"
            >
              Start free
              <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-0.5">&#8594;</span>
            </Link>
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              className="grid h-10 w-10 place-items-center rounded-full border border-line text-ink transition-colors hover:border-ink md:hidden"
            >
              <span className="relative block h-3 w-4">
                <span className={`absolute left-0 block h-px w-4 bg-current transition-all duration-300 ease-smooth ${open ? 'top-1.5 rotate-45' : 'top-0'}`} />
                <span className={`absolute left-0 top-1.5 block h-px w-4 bg-current transition-opacity duration-200 ${open ? 'opacity-0' : 'opacity-100'}`} />
                <span className={`absolute left-0 block h-px w-4 bg-current transition-all duration-300 ease-smooth ${open ? 'top-1.5 -rotate-45' : 'top-3'}`} />
              </span>
            </button>
          </div>
        </nav>
      </Container>

      <div
        className={`overflow-hidden border-t border-line bg-paper/95 backdrop-blur-xl transition-[max-height,opacity] duration-500 ease-smooth md:hidden ${
          open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <Container className="flex flex-col gap-1 py-4">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-xl px-3 py-3 text-[15px] font-medium text-ink2 transition-colors hover:bg-paperDeep hover:text-ink"
            >
              {link.label}
            </a>
          ))}
          <Link to="/signup" onClick={() => setOpen(false)} className="mt-2 rounded-full bg-ink px-5 py-3 text-center text-[14px] font-semibold text-paper">
            Start free
          </Link>
        </Container>
      </div>
    </header>
  );
}
