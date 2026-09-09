import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../components/app/AppShell';
import CategoryBars from '../components/charts/CategoryBars';
import CountUp from '../components/shared/CountUp';
import Reveal from '../components/shared/Reveal';
import { SkeletonPage } from '../components/shared/Skeleton';
import * as api from '../lib/api';
import { formatRupees } from '../lib/plan';
import { categoryLabel } from '../lib/categories';

/*
  The screen at /recap: a year, looked back on.

  Every other page here is about the next decision. This one is only about what
  already happened, and it earns its place for a different reason. A plan is
  easy to abandon in month three, and what makes somebody carry on is seeing
  that the last eleven months were not nothing.

  It is laid out as one thing at a time down the page rather than as a grid of
  cards, because it is a story and not a dashboard. Each section fades up as it
  is scrolled to, which is the same Reveal used on the landing page.

  No arithmetic happens here. Every figure is added up in SQL on the server, in
  one pass per question, because the year is a few thousand rows and the answer
  is eight numbers.

  Props:
    user - the signed-in person, handed down by RequireAuth
*/

// How many of the year's categories get a bar. Below this it is a long tail
// of small amounts that says nothing.
const CATEGORIES_TO_SHOW = 8;

export default function RecapPage({ user }) {
  const [years, setYears] = useState(null);
  const [chosenYear, setChosenYear] = useState('');
  const [recap, setRecap] = useState(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let stillMounted = true;

    const load = async () => {
      const response = await api.getRecapYears();

      if (stillMounted === false) {
        return;
      }

      if (response.ok === false) {
        setLoadError(response.error);
        return;
      }

      setYears(response.data.years);

      if (response.data.years.length > 0) {
        setChosenYear(response.data.years[0].year);
      }
    };

    load();

    return () => {
      stillMounted = false;
    };
  }, []);

  useEffect(() => {
    if (chosenYear === '') {
      return;
    }

    let stillMounted = true;

    const load = async () => {
      const response = await api.getRecap(chosenYear);

      if (stillMounted === false) {
        return;
      }

      if (response.ok === false) {
        setLoadError(response.error);
        return;
      }

      setRecap(response.data.recap);
    };

    load();

    return () => {
      stillMounted = false;
    };
  }, [chosenYear]);


  // ---------------------------------------------------------------
  // What to draw
  // ---------------------------------------------------------------

  if (loadError) {
    return (
      <AppShell user={user} title="Your year">
        <p className="text-[14.5px] text-clay">{loadError}</p>
      </AppShell>
    );
  }

  if (years === null) {
    return (
      <AppShell user={user} title="Your year">
        <SkeletonPage label="Looking back over the year" stats={3} cards={2} />
      </AppShell>
    );
  }

  // Nothing imported, so there is no year to look back on.
  if (years.length === 0) {
    return (
      <AppShell
        user={user}
        title="Your year."
        subtitle="Nothing to look back on yet."
      >
        <div className="rounded-[18px] border border-line bg-surface p-8 shadow-card">
          <p className="max-w-lg text-[15.5px] leading-relaxed text-ink2">
            This page is built from your bank statements rather than from
            anything you type, so it needs at least one month imported before it
            has something to say.
          </p>

          <Link
            to="/spending"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[13.5px] font-semibold text-paper transition-all duration-300 ease-smooth hover:bg-accent"
          >
            Import a month
            <span aria-hidden="true">&#8594;</span>
          </Link>
        </div>
      </AppShell>
    );
  }

  if (recap === null) {
    return (
      <AppShell user={user} title={chosenYear + '.'}>
        <SkeletonPage label="Adding up the year" stats={3} cards={2} />
      </AppShell>
    );
  }

  // ---- The sentences, built before the markup ----

  const monthCount = recap.covered.fromStatements;

  let coverLine = monthCount + ' months of statements';

  if (monthCount === 1) {
    coverLine = 'One month of statements';
  }

  // The share of what came in that was not spent. Guarded, because a year with
  // no income imported would otherwise divide by zero and print NaN.
  let keptShare = 0;

  if (recap.totals.cameIn > 0) {
    keptShare = (recap.kept / recap.totals.cameIn) * 100;
  }

  // The categories the server sent, cut to the ones worth a bar, with the share
  // of the year's spending worked out for each.
  const topCategories = [];

  let spentForShare = recap.totals.spent;

  if (spentForShare <= 0) {
    spentForShare = 1;
  }

  recap.categories.slice(0, CATEGORIES_TO_SHOW).forEach((entry) => {
    topCategories.push({
      key: entry.category,
      total: entry.total,
      share: (entry.total / spentForShare) * 100,
    });
  });

  const biggestCategory = recap.categories[0];

  /*
    The year buttons, and only when there is more than one year.

    A single button that cannot change anything is a control that does nothing,
    and a reader has to press it to find that out.
  */
  let yearPicker = null;

  if (years.length > 1) {
    yearPicker = (
      <div className="flex flex-wrap gap-2">
        {years.map((entry) => {
          let pillClasses = 'rounded-full border px-4 py-2 text-[13px] font-semibold '
            + 'transition-all duration-300 ease-smooth ';

          if (entry.year === chosenYear) {
            pillClasses = pillClasses + 'border-accent bg-accent text-paper';
          } else {
            pillClasses = pillClasses + 'border-line bg-surface text-ink2 hover:border-ink';
          }

          return (
            <button
              key={entry.year}
              type="button"
              onClick={() => setChosenYear(entry.year)}
              className={pillClasses}
            >
              {entry.year}
            </button>
            );
          })}
        </div>
    );
  }

  return (
    <AppShell
      user={user}
      title={chosenYear + '.'}
      subtitle={coverLine + ', read line by line.'}
      action={yearPicker}
    >      {/* ---------- What came in ---------- */}
      <Reveal>
        <section className="rounded-[18px] border border-line bg-surface p-8 shadow-card sm:p-10">
          <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">
            Came in
          </p>

          <p className="tnum mt-4 font-display text-[clamp(2.6rem,7vw,4.4rem)] leading-none text-accent">
            <CountUp
              to={recap.totals.cameIn}
              format={(value) => {
                return formatRupees(value);
              }}
            />
          </p>

          <p className="mt-5 max-w-lg text-[15.5px] leading-relaxed text-ink2">
            Across {recap.totals.lines} lines of statement. Everything below is
            what happened to it.
          </p>
        </section>
      </Reveal>

      {/* ---------- Spent, kept, put away ---------- */}
      <Reveal delay={80}>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          <Panel
            label="Spent"
            amount={recap.totals.spent}
            note="rent, food, bills, everything that went"
          />
          <Panel
            label="Kept"
            amount={recap.kept}
            note={Math.round(keptShare) + '% of what came in'}
            isNegative={recap.kept < 0}
          />
          <Panel
            label="Put away"
            amount={recap.totals.putAway}
            note="investing, which is not spending"
          />
        </div>
      </Reveal>

      {/* ---------- Where it went ---------- */}
      <Reveal delay={120}>
        <section className="mt-6 rounded-[18px] border border-line bg-surface p-6 shadow-card sm:p-8">
          <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">
            Where the year went
          </p>

          {biggestCategory ? (
            <p className="mt-4 max-w-xl font-display text-[clamp(1.4rem,3vw,1.9rem)] leading-snug">
              The biggest of them was {categoryLabel(biggestCategory.category).toLowerCase()},
              at {formatRupees(biggestCategory.total)}.
            </p>
          ) : null}

          <div className="mt-8">
            <CategoryBars categories={topCategories} />
          </div>
        </section>
      </Reveal>

      {/* ---------- The two ends of the year ---------- */}
      <Reveal delay={160}>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {recap.heaviestMonth ? (
            <MonthPanel
              label="Heaviest month"
              month={recap.heaviestMonth.month}
              total={recap.heaviestMonth.total}
            />
          ) : null}

          {recap.lightestMonth ? (
            <MonthPanel
              label="Lightest month"
              month={recap.lightestMonth.month}
              total={recap.lightestMonth.total}
            />
          ) : null}
        </div>
      </Reveal>

      {/* ---------- The habit ---------- */}
      {recap.mostFrequent ? (
        <Reveal delay={200}>
          <section className="mt-6 rounded-[18px] border border-brass/25 bg-brassSoft p-6 shadow-card sm:p-8">
            <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">
              Paid for most often
            </p>

            {/*
              Counted by how many times, not by how much. Those answer different
              questions: rent is the largest amount every year and surprises
              nobody, while forty small orders is a number most people have
              never seen written down.
            */}
            <p className="mt-4 max-w-xl font-display text-[clamp(1.4rem,3vw,1.9rem)] leading-snug">
              {recap.mostFrequent.name}, {recap.mostFrequent.times} times,
              for {formatRupees(recap.mostFrequent.total)} altogether.
            </p>
          </section>
        </Reveal>
      ) : null}

      {/* ---------- Out of here ---------- */}
      <Reveal delay={240}>
        <section className="mt-6 rounded-[18px] border border-line bg-paperDeep p-6 sm:p-8">
          <p className="max-w-xl text-[15.5px] leading-relaxed text-ink2">
            That is what happened. What happens next is on the plan, which is
            built from the same numbers.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/dashboard"
              className="rounded-full bg-ink px-5 py-2.5 text-[13.5px] font-semibold text-paper transition-all duration-300 ease-smooth hover:bg-accent"
            >
              Back to the plan
            </Link>

            <Link
              to="/spending"
              className="rounded-full border border-line px-5 py-2.5 text-[13.5px] font-semibold text-ink transition-all duration-300 ease-smooth hover:border-ink"
            >
              Import another month
            </Link>
          </div>
        </section>
      </Reveal>
    </AppShell>
  );
}


/* One of the three figures under the headline. */
function Panel({ label, amount, note, isNegative }) {
  let valueColour = 'text-ink';

  if (isNegative === true) {
    valueColour = 'text-clay';
  }

  return (
    <div className="rounded-[18px] border border-line bg-surface p-6 shadow-card">
      <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">{label}</p>

      <p className={'tnum mt-3 font-display text-[30px] leading-none ' + valueColour}>
        <CountUp
          to={amount}
          format={(value) => {
            return formatRupees(value, { short: true });
          }}
        />
      </p>

      <p className="mt-2.5 text-2xs leading-relaxed text-muted">{note}</p>
    </div>
  );
}


/* The heaviest or lightest month of the year. */
function MonthPanel({ label, month, total }) {
  const asDate = new Date(month + '-01T00:00:00');
  const name = asDate.toLocaleDateString('en-IN', { month: 'long' });

  return (
    <div className="rounded-[18px] border border-line bg-surface p-6 shadow-card sm:p-8">
      <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">{label}</p>

      <p className="mt-4 font-display text-[clamp(1.6rem,3.5vw,2.2rem)] leading-none">{name}</p>

      <p className="tnum mt-3 text-[15px] text-ink2">{formatRupees(total)} spent</p>
    </div>
  );
}
