import AppBar from './AppBar';
import Container from '../shared/Container';

/*
  AppShell
  --------
  The frame every signed-in page sits in: the bar across the top, the page
  heading, and the column the content lives in.

  Six pages use it. Without it, each of those six would repeat the same twenty
  lines of layout, and the day you wanted to change the heading spacing you
  would have to remember all six.

  Props:
    user     - the signed-in person, for the avatar
    title    - the big heading
    subtitle - the line under it
    action   - something to show on the right of the heading, usually a button
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
