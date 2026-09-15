import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import ThemeToggle from '../shared/ThemeToggle';
import * as api from '../../lib/api';
import { SECTIONS, SETTINGS_PATH, findSection } from '../../lib/navigation';

/*
  The left sidebar on signed-in pages. It lists only the section headings; the
  pages inside a section are tabs on the page itself (SectionTabs).

  On large screens it is always visible. Below that it is hidden off the left
  edge and slides in when the menu button in MobileTopBar is pressed.

  Props:
    user    - the signed-in person, for the name at the bottom
    isOpen  - whether the sliding version is showing (ignored on large screens)
    onClose - called when a link is picked, the backdrop is clicked or Escape is pressed
*/

export default function Sidebar({ user, isOpen, onClose }) {
  const navigate = useNavigate();

  // useLocation gives the current address. A section counts as active when the
  // page we are on is any one of its pages, not only the first.
  const location = useLocation();
  const activeSection = findSection(location.pathname);

  // Close on Escape, but only while the sliding version is open.
  useEffect(() => {
    if (isOpen === false) {
      return;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Remove the listener when the menu closes, or it keeps firing after.
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Stop the page behind from scrolling while the menu covers it.
  useEffect(() => {
    if (isOpen === true) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSignOut = async () => {
    // The server deletes the session, so a copied cookie stops working too.
    await api.logout();
    navigate('/');
  };

  let initial = 'N';
  if (user.name && user.name.length > 0) {
    initial = user.name[0].toUpperCase();
  }

  let displayName = 'Your account';
  if (user.name) {
    displayName = user.name;
  }

  // Slid off the left edge when closed. lg:translate-x-0 keeps it in place on
  // large screens whatever isOpen says.
  let panelClasses = 'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-line bg-paper '
    + 'transition-transform duration-500 ease-smooth lg:translate-x-0 ';
  if (isOpen === true) {
    panelClasses = panelClasses + 'translate-x-0 shadow-float';
  } else {
    panelClasses = panelClasses + '-translate-x-full';
  }

  // The dark layer behind the sliding menu. Never shown on large screens.
  let backdropClasses = 'fixed inset-0 z-40 bg-night/40 transition-opacity duration-500 ease-smooth lg:hidden ';
  if (isOpen === true) {
    backdropClasses = backdropClasses + 'opacity-100';
  } else {
    backdropClasses = backdropClasses + 'pointer-events-none opacity-0';
  }

  let settingsClasses = 'flex-1 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors ';
  if (location.pathname === SETTINGS_PATH) {
    settingsClasses = settingsClasses + 'bg-paperDeep text-ink';
  } else {
    settingsClasses = settingsClasses + 'text-muted hover:bg-paperDeep hover:text-ink';
  }

  return (
    <>
      <div className={backdropClasses} onClick={onClose} aria-hidden="true" />

      <aside className={panelClasses}>
        <div className="flex items-center justify-between px-6 py-5">
          <Link to="/dashboard" onClick={onClose} className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-ink text-[13px] font-bold text-paper">
              N
            </span>
            <span className="font-display text-[21px] leading-none tracking-tight">Nestworth</span>
          </Link>

          {/* Only the sliding version needs a close button. */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="grid h-9 w-9 place-items-center rounded-full border border-line text-ink transition-colors hover:border-ink lg:hidden"
          >
            <span aria-hidden="true" className="text-[18px] leading-none">&times;</span>
          </button>
        </div>

        <nav aria-label="Sections" className="flex-1 overflow-y-auto px-4 pt-2">
          <p className="px-3 pb-2 text-2xs font-semibold uppercase tracking-widest2 text-muted">Sections</p>

          <ul className="space-y-1">
            {SECTIONS.map((section) => {
              let isActive = false;
              if (activeSection !== null && activeSection.key === section.key) {
                isActive = true;
              }

              let linkClasses = 'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors ';
              let markerClasses = 'h-4 w-[3px] rounded-full transition-colors ';

              if (isActive === true) {
                linkClasses = linkClasses + 'bg-paperDeep text-ink';
                markerClasses = markerClasses + 'bg-accent';
              } else {
                linkClasses = linkClasses + 'text-ink2 hover:bg-paperDeep hover:text-ink';
                markerClasses = markerClasses + 'bg-transparent';
              }

              let ariaCurrent = undefined;
              if (isActive === true) {
                ariaCurrent = 'page';
              }

              return (
                <li key={section.key}>
                  <Link
                    to={section.pages[0].to}
                    onClick={onClose}
                    aria-current={ariaCurrent}
                    className={linkClasses}
                  >
                    <span aria-hidden="true" className={markerClasses} />
                    {section.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-line px-4 py-4">
          <div className="flex items-center gap-2">
            <Link to={SETTINGS_PATH} onClick={onClose} className={settingsClasses}>
              Settings
            </Link>
            <ThemeToggle />
          </div>

          <div className="mt-3 flex items-center gap-3 px-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-[13px] font-semibold text-paper">
              {initial}
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-medium text-ink">{displayName}</p>
              <button
                type="button"
                onClick={handleSignOut}
                className="text-[13px] text-muted transition-colors hover:text-ink"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
