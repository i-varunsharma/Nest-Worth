import { useMemo } from 'react';
import Container from '../shared/Container';
import Eyebrow from '../shared/Eyebrow';
import Reveal from '../shared/Reveal';
import useReveal from '../../hooks/useReveal';
import { buildPlan, formatRupees } from '../../lib/plan';

export default function HouseholdFlow({ state }) {
  const plan = useMemo(() => buildPlan(state), [state]);
  const [ref, isIn] = useReveal({ threshold: 0.3 });

  const rows = [
    { label: 'Take-home income', amount: plan.income, tone: 'ink', note: 'What the offer letter promised' },
    { label: 'Household support', amount: plan.support, tone: 'brass', note: state.dependents === 0 ? 'Nobody depends on you yet' : `${state.dependents} ${state.dependents === 1 ? 'person depends' : 'people depend'} on this salary` },
    { label: 'Education loan EMI', amount: plan.emi, tone: 'clay', note: state.hasLoan ? 'Started before the first payslip did' : 'No loan running' },
    { label: 'Left for you', amount: plan.free, tone: 'accent', note: 'The only number worth planning with' },
  ];

  const tones = {
    ink: 'bg-ink/45',
    brass: 'bg-brass',
    clay: 'bg-clay',
    accent: 'bg-accent',
  };

  return (
    <section id="household" className="border-y border-line bg-paperDeep">
      <Container className="py-24 lg:py-32">
        <div className="grid gap-14 lg:grid-cols-2 lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Reveal><Eyebrow>The problem</Eyebrow></Reveal>
            <Reveal delay={80}>
              <h2 className="mt-6 max-w-md font-display text-[clamp(2.1rem,4vw,3.1rem)] leading-[1.06] tracking-[-0.02em]">
                The money leaves before the advice arrives.
              </h2>
            </Reveal>
            <Reveal delay={150}>
              <p className="mt-6 max-w-md text-[16px] leading-relaxed text-ink2">
                By the time you open a budgeting app, a third of the salary is already spoken for.
                Rent sent home. A sibling&rsquo;s semester fee. An EMI that started before the
                first payslip did.
              </p>
            </Reveal>
            <Reveal delay={210}>
              <p className="mt-4 max-w-md text-[16px] leading-relaxed text-ink2">
                Advice that ignores all of that is not advice. It is arithmetic for
                somebody else&rsquo;s life.
              </p>
            </Reveal>
            <Reveal delay={270}>
              <div className="mt-9 border-l-2 border-accent pl-5">
                <p className="font-display text-[20px] italic leading-snug text-ink">
                  &ldquo;Fifty-thirty-twenty assumes the fifty is yours to spend.&rdquo;
                </p>
              </div>
            </Reveal>
          </div>

          <div ref={ref}>
            <div className="rounded-[26px] border border-line bg-surface p-6 shadow-card sm:p-8">
              <div className="flex items-center justify-between border-b border-lineSoft pb-4">
                <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">Where it actually goes</p>
                <p className="text-2xs text-muted">Monthly</p>
              </div>

              <ul className="mt-2">
                {rows.map((row, index) => {
                  const width = plan.income > 0 ? (row.amount / plan.income) * 100 : 0;
                  return (
                    <li key={row.label} className="border-b border-lineSoft py-5 last:border-0">
                      <div className="flex items-baseline justify-between gap-4">
                        <p className={`text-[14.5px] ${index === rows.length - 1 ? 'font-semibold text-ink' : 'font-medium text-ink2'}`}>
                          {row.label}
                        </p>
                        <p className={`tnum text-[16px] font-semibold ${row.amount === 0 ? 'text-muted' : index === rows.length - 1 ? 'text-accent' : 'text-ink'}`}>
                          {formatRupees(row.amount)}
                        </p>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line/70">
                        <div
                          className={`h-full rounded-full transition-[width] duration-[900ms] ease-smooth ${tones[row.tone]}`}
                          style={{ width: isIn ? `${width}%` : '0%', transitionDelay: `${index * 110}ms` }}
                        />
                      </div>
                      <p className="mt-2.5 text-2xs text-muted">{row.note}</p>
                    </li>
                  );
                })}
              </ul>
            </div>
            <p className="mt-5 text-center text-[12.5px] text-muted lg:text-left">
              Still following the numbers you set in the planner above.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
