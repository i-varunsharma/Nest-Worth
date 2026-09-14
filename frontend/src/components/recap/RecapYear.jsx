import { Link } from 'react-router-dom';
import CategoryBars from '../charts/CategoryBars';
import Card from '../shared/Card';
import CountUp from '../shared/CountUp';
import Overline from '../shared/Overline';
import Reveal from '../shared/Reveal';
import { SkeletonPage } from '../shared/Skeleton';
import useAsyncData from '../../hooks/useAsyncData';
import * as api from '../../lib/api';
import { categoryLabel } from '../../lib/categories';
import { formatRupees } from '../../lib/plan';

/*
  One year of statements, added up, laid out as a story down the page. Every
  figure is worked out in SQL on the server.
*/

// Below this many categories the bars are a long tail of small amounts.
const CATEGORIES_TO_SHOW = 8;

async function loadRecap(year) {
  const result = await api.getRecap(year);

  if (result.ok === false) {
    return result;
  }

  return { ok: true, data: result.data.recap };
}

function formatShort(value) {
  return formatRupees(value, { short: true });
}

function formatFull(value) {
  return formatRupees(value);
}

function Figure({ label, amount, note, isNegative }) {
  let valueColour = 'text-ink';
  if (isNegative === true) {
    valueColour = 'text-clay';
  }

  return (
    <Card size="section">
      <Overline>{label}</Overline>
      <p className={'tnum mt-3 font-display text-[30px] leading-none ' + valueColour}>
        <CountUp to={amount} format={formatShort} />
      </p>
      <p className="mt-2.5 text-2xs leading-relaxed text-muted">{note}</p>
    </Card>
  );
}

function MonthPanel({ label, month, total }) {
  const name = new Date(month + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'long' });

  return (
    <Card size="section" className="sm:p-8">
      <Overline>{label}</Overline>
      <p className="mt-4 font-display text-[clamp(1.6rem,3.5vw,2.2rem)] leading-none">{name}</p>
      <p className="tnum mt-3 text-[15px] text-ink2">{formatRupees(total)} spent</p>
    </Card>
  );
}

/* The top categories with their share of the year's spending. */
function topCategoriesOf(recap) {
  let spentForShare = recap.totals.spent;
  if (spentForShare <= 0) {
    spentForShare = 1;
  }

  return recap.categories.slice(0, CATEGORIES_TO_SHOW).map((entry) => {
    return { key: entry.category, total: entry.total, share: (entry.total / spentForShare) * 100 };
  });
}

export default function RecapYear({ year }) {
  const loaded = useAsyncData(loadRecap, year);

  if (loaded.error) {
    return <p role="alert" className="text-[14.5px] text-clay">{loaded.error}</p>;
  }

  if (loaded.data === null || loaded.data.year !== year) {
    return <SkeletonPage label="Adding up the year" stats={3} cards={2} />;
  }

  const recap = loaded.data;
  const biggestCategory = recap.categories[0];

  let coverage = recap.covered.fromStatements + ' months of statements';
  if (recap.covered.fromStatements === 1) {
    coverage = 'one month of statements';
  }

  let keptShare = 0;
  if (recap.totals.cameIn > 0) {
    keptShare = (recap.kept / recap.totals.cameIn) * 100;
  }

  return (
    <>
      <Reveal>
        <section className="rounded-[18px] border border-line bg-surface p-8 shadow-card sm:p-10">
          <Overline>Came in</Overline>
          <p className="tnum mt-4 font-display text-[clamp(2.6rem,7vw,4.4rem)] leading-none text-accent">
            <CountUp to={recap.totals.cameIn} format={formatFull} />
          </p>
          <p className="mt-5 max-w-lg text-[15.5px] leading-relaxed text-ink2">
            Across {recap.totals.lines} lines from {coverage}. Everything below is what happened to it.
          </p>
        </section>
      </Reveal>

      <Reveal delay={80}>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          <Figure label="Spent" amount={recap.totals.spent} note="rent, food, bills, everything that went" />
          <Figure label="Kept" amount={recap.kept} note={Math.round(keptShare) + '% of what came in'} isNegative={recap.kept < 0} />
          <Figure label="Put away" amount={recap.totals.putAway} note="investing, which is not spending" />
        </div>
      </Reveal>

      <Reveal delay={120}>
        <Card as="section" size="section" className="mt-6 sm:p-8">
          <Overline>Where the year went</Overline>

          {biggestCategory ? (
            <p className="mt-4 max-w-xl font-display text-[clamp(1.4rem,3vw,1.9rem)] leading-snug">
              The biggest of them was {categoryLabel(biggestCategory.category).toLowerCase()}, at{' '}
              {formatRupees(biggestCategory.total)}.
            </p>
          ) : null}

          <div className="mt-8">
            <CategoryBars categories={topCategoriesOf(recap)} />
          </div>
        </Card>
      </Reveal>

      <Reveal delay={160}>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {recap.heaviestMonth ? (
            <MonthPanel label="Heaviest month" month={recap.heaviestMonth.month} total={recap.heaviestMonth.total} />
          ) : null}
          {recap.lightestMonth ? (
            <MonthPanel label="Lightest month" month={recap.lightestMonth.month} total={recap.lightestMonth.total} />
          ) : null}
        </div>
      </Reveal>

      {recap.mostFrequent ? (
        <Reveal delay={200}>
          <section className="mt-6 rounded-[18px] border border-brass/25 bg-brassSoft p-6 shadow-card sm:p-8">
            <Overline>Paid for most often</Overline>
            <p className="mt-4 max-w-xl font-display text-[clamp(1.4rem,3vw,1.9rem)] leading-snug">
              {recap.mostFrequent.name}, {recap.mostFrequent.times} times, for{' '}
              {formatRupees(recap.mostFrequent.total)} altogether.
            </p>
          </section>
        </Reveal>
      ) : null}

      <Reveal delay={240}>
        <section className="mt-6 rounded-[18px] border border-line bg-paperDeep p-6 sm:p-8">
          <p className="max-w-xl text-[15.5px] leading-relaxed text-ink2">
            That is what happened. What happens next is on the plan, which is built from the same numbers.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/dashboard" className="rounded-full bg-ink px-5 py-2.5 text-[13.5px] font-semibold text-paper transition-all duration-300 ease-smooth hover:bg-accent">
              Back to the plan
            </Link>
            <Link to="/spending" className="rounded-full border border-line px-5 py-2.5 text-[13.5px] font-semibold text-ink transition-all duration-300 ease-smooth hover:border-ink">
              Import another month
            </Link>
          </div>
        </section>
      </Reveal>
    </>
  );
}
