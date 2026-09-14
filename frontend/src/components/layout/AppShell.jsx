import AppBar from './AppBar';
import Container from '../shared/Container';

/*
  The frame every signed-in page sits in: the top bar, the page heading, and the
  column the content lives in. Six pages use it, so changing the heading spacing
  is one edit rather than six.

  Props:
    user     - the signed-in person, for the avatar
    title    - the big heading
    subtitle - the line under it
    action   - shown to the right of the heading, usually a button
    children - the page itself
*/
export default function AppShell({ user, title, subtitle, action, children }) {
  return (
    <div className="min-h-screen bg-paper">
      <AppBar name={user.name} />

      <main>
        <Container className="py-10 lg:py-14">

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
  );
}
