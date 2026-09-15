import { useState } from 'react';
import Container from '../shared/Container';
import MobileTopBar from './MobileTopBar';
import SectionTabs from './SectionTabs';
import Sidebar from './Sidebar';

/*
  The frame every signed-in page sits in: the sidebar on the left, the tabs for
  the current section, the page heading, and the column the content lives in.

  Props:
    user     - the signed-in person, for the sidebar
    title    - the big heading
    subtitle - the line under it
    action   - shown to the right of the heading, usually a button
    children - the page itself
*/
export default function AppShell({ user, title, subtitle, action, children }) {
  // Whether the sliding sidebar is open on smaller screens. It lives here, not
  // in Sidebar, because the button that opens it is in MobileTopBar. The parent
  // of both holds the state and hands each one what it needs.
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const openMenu = () => {
    setIsMenuOpen(true);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-paper">
      <Sidebar user={user} isOpen={isMenuOpen} onClose={closeMenu} />

      {/* lg:pl-64 leaves room for the sidebar, which is w-64 wide. Change both together. */}
      <div className="lg:pl-64">
        <MobileTopBar onOpenMenu={openMenu} />

        <main>
          <Container className="py-8 lg:py-12">
            <SectionTabs />

            <div className="flex flex-wrap items-end justify-between gap-5">
              <div>
                <h1 className="font-display text-[clamp(2rem,4vw,2.9rem)] leading-[1.06] tracking-[-0.02em]">
                  {title}
                </h1>

                {subtitle ? (
                  <p className="mt-2.5 max-w-xl text-[15px] leading-relaxed text-ink2">{subtitle}</p>
                ) : null}
              </div>

              {action}
            </div>

            <div className="mt-10">{children}</div>
          </Container>
        </main>
      </div>
    </div>
  );
}
