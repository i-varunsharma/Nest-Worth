import Button from '../shared/Button';
import Container from '../shared/Container';
import Reveal from '../shared/Reveal';

/*
  FinalCTA
  --------
  The last dark slab before the footer. One job: ask for the sign-up, from
  someone who has now read the whole page.
*/
export default function FinalCTA() {
  return (
    <section className="bg-paper px-4 pb-6 sm:px-6">
      <div className="relative overflow-hidden rounded-[32px] bg-night text-paper">

        <div className="grid-texture-dark pointer-events-none absolute inset-0" aria-hidden="true" />

        {/* A soft green glow rising from the bottom edge. */}
        <div
          className="pointer-events-none absolute -bottom-52 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full blur-3xl"
          style={{
            background:
              'radial-gradient(closest-side, rgba(31,83,64,0.55), rgba(169,124,44,0.18), transparent)',
          }}
          aria-hidden="true"
        />

        <Container className="relative py-24 text-center lg:py-32">
          <Reveal>
            <span className="inline-flex items-center gap-2.5 rounded-full border border-white/15 px-3.5 py-1.5 text-2xs font-semibold uppercase tracking-widest2 text-paper/70">
              <span className="h-1.5 w-1.5 rounded-full bg-mint" />
              Free while in beta
            </span>
          </Reveal>

          <Reveal delay={80}>
            <h2 className="mx-auto mt-8 max-w-2xl font-display text-[clamp(2.4rem,5.4vw,4rem)] leading-[1.02] tracking-[-0.02em]">
              See what your household changes.
            </h2>
          </Reveal>

          <Reveal delay={150}>
            <p className="mx-auto mt-6 max-w-md text-[16px] leading-relaxed text-paper/60">
              Three minutes, no bank account, and a plan that finally accounts for
              everyone your salary is quietly carrying.
            </p>
          </Reveal>

          <Reveal delay={220}>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Button to="/signup" variant="lightOnDark" arrow>Get your plan</Button>
              <Button href="#how" variant="ghostOnDark">Read how it works</Button>
            </div>
          </Reveal>
        </Container>
      </div>
    </section>
  );
}
