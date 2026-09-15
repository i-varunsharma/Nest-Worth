import { NavLink, useLocation } from 'react-router-dom';
import { findSection } from '../../lib/navigation';

/*
  The pages inside the current section, as tabs above the page heading.
  On /goals this shows Plans, Goals, Stress test with Goals underlined.

  Nothing is drawn for a section with a single page (Overview), or for a page
  that is in no section (Settings).
*/

export default function SectionTabs() {
  const location = useLocation();
  const section = findSection(location.pathname);

  if (section === null) {
    return null;
  }

  if (section.pages.length < 2) {
    return null;
  }

  // NavLink passes { isActive } so the current tab can be underlined.
  const tabClasses = ({ isActive }) => {
    const base = '-mb-px whitespace-nowrap border-b-2 px-1 pb-3 text-[14px] font-medium transition-colors duration-300 ';

    if (isActive === true) {
      return base + 'border-accent text-ink';
    }

    return base + 'border-transparent text-muted hover:text-ink';
  };

  return (
    <nav aria-label={'Pages in ' + section.label} className="mb-8">
      <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">{section.label}</p>

      {/* overflow-x-auto lets the tabs scroll sideways on a narrow phone instead of wrapping. */}
      <div className="mt-3 flex gap-6 overflow-x-auto border-b border-line">
        {section.pages.map((page) => {
          return (
            <NavLink key={page.to} to={page.to} className={tabClasses}>
              {page.label}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
