import { render, screen } from '@testing-library/react';
import CategoryBars from '../src/components/charts/CategoryBars';
import { categoryLabel, isKnownCategory, isSpending } from '../src/lib/categories';

/*
  The spending breakdown.

  The chart tests here read the geometry that was actually produced, for the
  same reason as the other charts: a bar with a width of NaN does not throw. It
  draws nothing, which looks exactly like a chart that has not loaded.

  The category tests are about the shared list. Both the browser and the server
  read it, and the server refuses anything not on it, so a key that exists in
  one place and not the other is a dropdown that saves nothing and reports no
  error.
*/

const categories = [
  { key: 'rent', total: 24000, share: 37.28 },
  { key: 'emi', total: 11319, share: 17.58 },
  { key: 'groceries', total: 8790, share: 13.65 },
  { key: 'fees', total: 35.4, share: 0.05 },
];


test('every bar gets a width, and none of them is NaN or past the end', () => {
  const { container } = render(<CategoryBars categories={categories} />);

  const bars = container.querySelectorAll('li div div');

  expect(bars.length).toBe(categories.length);

  bars.forEach((bar) => {
    const width = Number.parseFloat(bar.style.width);

    expect(Number.isNaN(width)).toBe(false);
    expect(width).toBeLessThanOrEqual(100);
    expect(width).toBeGreaterThanOrEqual(0);
  });
});


test('a category worth almost nothing still draws a visible mark', () => {
  /*
    Bank charges here are 0.05% of the month. Drawn to scale that is a fifth of
    one pixel, which is not a small bar, it is no bar at all, and the row reads
    as broken. The figure beside it is still the truth.
  */
  const { container } = render(<CategoryBars categories={categories} />);

  const bars = container.querySelectorAll('li div div');
  const smallest = bars[bars.length - 1];

  expect(Number.parseFloat(smallest.style.width)).toBeGreaterThan(0.5);
});


test('each bar is named in words, so nothing depends on reading a colour', () => {
  render(<CategoryBars categories={categories} />);

  expect(screen.getByText('Rent')).toBeInTheDocument();
  expect(screen.getByText('Loan repayments')).toBeInTheDocument();
  expect(screen.getByText('Bank charges')).toBeInTheDocument();
});


test('an empty month says so instead of drawing an empty chart', () => {
  render(<CategoryBars categories={[]} />);

  expect(screen.getByText(/Nothing was spent/)).toBeInTheDocument();
});


test('investing and transfers are not counted as spending', () => {
  /*
    The one rule that would quietly ruin every figure on the page. A SIP leaving
    the account is money moved, not money spent, and counting it would report
    the worst spending month on the month somebody saved the most.
  */
  expect(isSpending('investment')).toBe(false);
  expect(isSpending('transfer')).toBe(false);
  expect(isSpending('income')).toBe(false);

  expect(isSpending('food')).toBe(true);
  expect(isSpending('rent')).toBe(true);
});


test('every category the chart can be given has a name to print', () => {
  categories.forEach((entry) => {
    expect(isKnownCategory(entry.key)).toBe(true);
    expect(categoryLabel(entry.key)).not.toBe(entry.key);
  });
});


test('an unknown key comes back as itself rather than as a blank', () => {
  // A blank label would be an invisible row. Showing the raw key is ugly and
  // is at least a thing somebody can report.
  expect(categoryLabel('yachts')).toBe('yachts');
});
