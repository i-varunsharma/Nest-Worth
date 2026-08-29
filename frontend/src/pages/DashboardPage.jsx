import { Link } from 'react-router-dom';
import AppBar from '../components/app/AppBar';
import PlanCard from '../components/app/PlanCard';
import PriorityCard from '../components/app/PriorityCard';
import OutflowCard from '../components/app/OutflowCard';
import ProgressCard from '../components/app/ProgressCard';
import ProjectionChart from '../components/landing/ProjectionChart';
import Container from '../components/shared/Container';
import Eyebrow from '../components/shared/Eyebrow';
import { buildPlan, buildProjectionRows, formatRupees } from '../lib/plan';
import { greetingForNow, loadHousehold } from '../lib/household';

/*
  DashboardPage
  -------------
  The screen at /dashboard. This is where someone lands after signing in, and
  where onboarding sends them once the questions are answered.

  It reads the household that was saved during onboarding, runs the same
  buildPlan() the landing page uses, and lays the answer out across a few cards.

  Notice how little happens in this file. It loads the data, does the maths once,
  and hands finished pieces to the cards. Each card only knows how to draw what
  it is given. Keeping the thinking in one place and the drawing in another is
  what stops a page like this turning into a thousand-line file.
*/

// How far ahead the chart at the bottom looks.
const PROJECTION_YEARS = 15;

export default function DashboardPage() {
  // Read the answers back out of the browser's storage. If nothing was ever
  // saved, loadHousehold gives us a sensible default instead of crashing.
  const household = loadHousehold();

  // One calculation, shared by every card below.
  const plan = buildPlan(household);

  // Pull the invest bucket out for the projection chart.
  let monthlyInvestment = 0;
  let monthlySaving = 0;

  plan.buckets.forEach((bucket) => {
    if (bucket.key === 'invest') {
      monthlyInvestment = bucket.amount;
    }
    if (bucket.key === 'save') {
      monthlySaving = bucket.amount;
    }
  });

  const projectionRows = buildProjectionRows(monthlyInvestment, PROJECTION_YEARS);
  const finalValue = projectionRows[projectionRows.length - 1].value;

  // "August 2026", used under the greeting.
  const thisMonth = new Date().toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  // Greet by name when we have one. Signing in by phone does not give us a name.
  let greeting = greetingForNow() + '.';
  if (household.name) {
    greeting = greetingForNow() + ', ' + household.name + '.';
  }

  return (
    <div className="min-h-screen bg-paper">
      <AppBar name={household.name} />

      <main>
        <Container className="py-10 lg:py-14">

          {/* ---------- Greeting ---------- */}
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <h1 className="font-display text-[clamp(2rem,4vw,2.9rem)] leading-[1.06] tracking-[-0.02em]">
                {greeting}
              </h1>
              <p className="mt-2.5 text-[15px] text-ink2">
                Your plan for {thisMonth}, built from your household.
              </p>
            </div>

            <Link
              to="/onboarding"
              className="group inline-flex items-center gap-2 rounded-full border border-line bg-surface px-5 py-2.5 text-[13.5px] font-semibold text-ink transition-all duration-300 ease-smooth hover:border-ink hover:shadow-card"
            >
              Edit household
              <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-0.5">
                &#8594;
              </span>
            </Link>
          </div>

          {/* ---------- The plan ---------- */}
          {/* On a phone this is one column. From large screens up the main card
              takes the wider side and the two smaller cards stack beside it. */}
          <div className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <PlanCard plan={plan} />

            <div className="space-y-6">
              <PriorityCard reasoning={plan.reasoning} />
              <ProgressCard monthlySaving={monthlySaving} />
            </div>
          </div>

          {/* ---------- Where the money goes ---------- */}
          <div className="mt-6">
            <OutflowCard
              plan={plan}
              dependents={household.dependents}
              hasLoan={household.hasLoan}
            />
          </div>

          {/* ---------- The long view ---------- */}
          <div id="future" className="mt-16">
            <Eyebrow>Future you</Eyebrow>

            <div className="mt-5 flex flex-wrap items-end justify-between gap-5">
              <h2 className="max-w-md font-display text-[clamp(1.7rem,3vw,2.3rem)] leading-[1.1] tracking-[-0.02em]">
                Keep the {formatRupees(monthlyInvestment)} going and this is where it lands.
              </h2>
              <p className="tnum font-display text-[clamp(2rem,4vw,2.8rem)] leading-none text-accent">
                {formatRupees(finalValue, { short: true })}
              </p>
            </div>

            <div className="mt-7">
              <ProjectionChart rows={projectionRows} years={PROJECTION_YEARS} />
            </div>
          </div>

          <p className="mt-14 border-t border-line pt-7 text-2xs leading-relaxed text-muted">
            Educational guidance, not regulated investment advice. Your answers are stored
            in this browser only, and never leave your device.
          </p>
        </Container>
      </main>
    </div>
  );
}
