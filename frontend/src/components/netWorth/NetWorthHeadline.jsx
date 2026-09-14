import { Link } from 'react-router-dom';
import Card from '../shared/Card';
import Overline from '../shared/Overline';
import { formatRupees } from '../../lib/plan';

/*
  Net worth, with owned and owed drawn as two bars against the larger of the two.
  A negative figure early in a career is normal, and the text says so.
*/

function ComparisonBar({ label, amount, largest, colour, children }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[13.5px] font-medium text-ink2">{label}</span>
        <span className="tnum text-[15px] font-semibold text-ink">{formatRupees(amount)}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-paperDeep">
        <div
          className={'h-full rounded-full transition-[width] duration-700 ease-smooth ' + colour}
          style={{ width: (amount / largest) * 100 + '%' }}
        />
      </div>
      {children}
    </div>
  );
}

export default function NetWorthHeadline({ summary }) {
  const isNegative = summary.netWorth < 0;

  let largest = Math.max(summary.totalAssets, summary.totalDebts);
  if (largest === 0) {
    largest = 1;
  }

  let figureColour = 'text-accent';
  let explanation = 'Above water. Everything you own is worth more than everything you owe.';

  if (isNegative === true) {
    figureColour = 'text-clay';
    explanation = 'Below zero, which is completely normal this early. An education loan arrives years before '
      + 'the savings do. What matters is the direction, and every EMI moves this number up.';
  }

  return (
    <Card size="panel">
      <Overline>Where you stand today</Overline>

      <p className={'tnum mt-4 font-display text-[clamp(2.6rem,6vw,3.6rem)] leading-none ' + figureColour}>
        {formatRupees(summary.netWorth)}
      </p>

      <p className="mt-4 max-w-lg text-[14.5px] leading-relaxed text-ink2">{explanation}</p>

      <div className="mt-8 space-y-4">
        <ComparisonBar label="You own" amount={summary.totalAssets} largest={largest} colour="bg-accent" />

        <ComparisonBar label="You owe" amount={summary.totalDebts} largest={largest} colour="bg-clay">
          <p className="mt-2 text-2xs text-muted">
            From your{' '}
            <Link to="/debts" className="sweep font-medium text-ink">
              debts
            </Link>
            . Edit them there.
          </p>
        </ComparisonBar>
      </div>
    </Card>
  );
}
