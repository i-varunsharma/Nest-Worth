import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CashRunway from '../src/components/charts/CashRunway';
import ResilienceCard from '../src/components/app/ResilienceCard';
import FamilyForm from '../src/components/app/FamilyForm';

/*
  Tests for the family page, the stress test page and the pieces they are made
  of. Run with: npm test

  The maths behind both is tested on the backend side, in finances.test.js.
  These check the screens: that the chart draws real numbers, that the form
  sends what the API expects, and that each page renders from API data without
  crashing.
*/

/*
  vi.mock is moved to the top of the file before anything runs, so it cannot
  see ordinary variables. vi.hoisted makes this one object available to it, and
  a test can flip a flag on it to make a request fail.
*/
const mockState = vi.hoisted(() => {
  return { familyFails: false };
});

vi.mock('../src/lib/api', () => {
  return {
    getHousehold: async () => {
      return {
        ok: true,
        data: {
          household: {
            income: 90000,
            dependents: 2,
            hasLoan: false,
            incomeVaries: false,
            essentialCosts: 25000,
            chosenPlan: null,
            isSaved: true,
          },
        },
      };
    },
    getDebts: async () => {
      return { ok: true, data: { debts: [] } };
    },
    getAssets: async () => {
      return { ok: true, data: { assets: [{ id: 1, name: 'Savings', kind: 'cash', value: 60000 }] } };
    },
    getFamily: async () => {
      if (mockState.familyFails === true) {
        return { ok: false, error: 'The family list could not be loaded.' };
      }

      return {
        ok: true,
        data: {
          family: [
            { id: 1, name: 'Papa', relation: 'parent', monthlySupport: 8000, hasHealthCover: false },
            { id: 2, name: 'Riya', relation: 'sibling', monthlySupport: 4000, hasHealthCover: true },
          ],
        },
      };
    },
  };
});


// ---------------------------------------------------------------
// The chart
// ---------------------------------------------------------------

const rows = [
  { month: 0, cash: 50000, isCrisis: false },
  { month: 1, cash: 10000, isCrisis: true },
  { month: 2, cash: -30000, isCrisis: true },
  { month: 3, cash: -5000, isCrisis: false },
];

test('the runway draws one bar per month with real numbers', () => {
  const { container } = render(<CashRunway rows={rows} />);

  // Bars have rounded corners; the crisis bands do not.
  const bars = container.querySelectorAll('rect[rx]');
  expect(bars.length).toBe(4);

  bars.forEach((bar) => {
    for (const name of ['x', 'y', 'width', 'height']) {
      expect(Number.isFinite(Number(bar.getAttribute(name)))).toBe(true);
    }
  });
});


test('months below zero are drawn in the warning colour', () => {
  const { container } = render(<CashRunway rows={rows} />);
  const bars = container.querySelectorAll('rect[rx]');

  expect(bars[0].getAttribute('fill')).toBe('var(--chart-save)');
  expect(bars[2].getAttribute('fill')).toBe('rgb(var(--color-clay))');
});


test('the crisis months get a band behind them', () => {
  const { container } = render(<CashRunway rows={rows} />);

  // Two crisis months, so two bands without rounded corners.
  const bands = container.querySelectorAll('rect:not([rx])');
  expect(bands.length).toBe(2);
});


// ---------------------------------------------------------------
// The dashboard card
// ---------------------------------------------------------------

test('the resilience card counts what was survived', () => {
  const summary = {
    survivedCount: 3,
    total: 4,
    results: [
      { shock: { type: 'job_loss' }, title: 'Income stops', verdict: 'breaks' },
      { shock: { type: 'income_cut' }, title: 'Income falls', verdict: 'tight' },
      { shock: { type: 'medical' }, title: 'Hospital bill', verdict: 'safe' },
      { shock: { type: 'family_support' }, title: 'Family needs more', verdict: 'safe' },
    ],
  };

  render(
    <MemoryRouter>
      <ResilienceCard summary={summary} familyListed={true} />
    </MemoryRouter>,
  );

  expect(screen.getByText('3 of 4')).toBeInTheDocument();
  expect(screen.getByText('Runs out')).toBeInTheDocument();
  expect(screen.getByText('Only just')).toBeInTheDocument();
});


// ---------------------------------------------------------------
// The form
// ---------------------------------------------------------------

test('the family form refuses a missing name without calling the server', async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();

  render(<FamilyForm onSave={onSave} onCancel={() => {}} />);

  await user.click(screen.getByRole('button', { name: 'Add person' }));

  expect(screen.getByText('Give this person a name.')).toBeInTheDocument();
  expect(onSave).not.toHaveBeenCalled();
});


test('the family form sends a number and a real true or false', async () => {
  const user = userEvent.setup();
  const onSave = vi.fn(async () => {
    return { ok: true };
  });

  render(<FamilyForm onSave={onSave} onCancel={() => {}} />);

  await user.type(screen.getByLabelText('Name'), 'Maa');
  await user.type(screen.getByLabelText('Support each month'), '7500');
  await user.selectOptions(screen.getByLabelText('Health insurance'), 'yes');
  await user.click(screen.getByRole('button', { name: 'Add person' }));

  expect(onSave).toHaveBeenCalledWith({
    name: 'Maa',
    relation: 'parent',
    monthlySupport: 7500,
    hasHealthCover: true,
  });
});


test('an empty support box is saved as zero, not refused', async () => {
  const user = userEvent.setup();
  const onSave = vi.fn(async () => {
    return { ok: true };
  });

  render(<FamilyForm onSave={onSave} onCancel={() => {}} />);

  await user.type(screen.getByLabelText('Name'), 'Aarav');
  await user.click(screen.getByRole('button', { name: 'Add person' }));

  expect(onSave.mock.calls[0][0].monthlySupport).toBe(0);
});


// ---------------------------------------------------------------
// The pages
// ---------------------------------------------------------------

test('the family page shows the real total and warns about missing cover', async () => {
  mockState.familyFails = false;

  const { default: FamilyPage } = await import('../src/pages/FamilyPage');

  render(
    <MemoryRouter>
      <FamilyPage user={{ name: 'Varun' }} />
    </MemoryRouter>,
  );

  // 8000 + 4000, the real amounts rather than the estimate for two people.
  expect(await screen.findByText('₹12,000')).toBeInTheDocument();
  expect(screen.getByText('Papa has no health cover.')).toBeInTheDocument();
});


test('the stress test page draws, and switching shock changes the description', async () => {
  mockState.familyFails = false;

  const { default: StressTestPage } = await import('../src/pages/StressTestPage');
  const user = userEvent.setup();

  render(
    <MemoryRouter>
      <StressTestPage user={{ name: 'Varun' }} />
    </MemoryRouter>,
  );

  expect(await screen.findByText('Your income stops for 4 months.')).toBeInTheDocument();

  const tabs = screen.getByRole('tablist');
  await user.click(within(tabs).getByRole('tab', { name: /Hospital bill/ }));

  // The bill goes to the first person without cover.
  expect(screen.getByText(/hospital bill for Papa, with no health cover/)).toBeInTheDocument();
});


test('a failed request stops the page rather than drawing a plan with data missing', async () => {
  mockState.familyFails = true;

  const { default: StressTestPage } = await import('../src/pages/StressTestPage');

  render(
    <MemoryRouter>
      <StressTestPage user={{ name: 'Varun' }} />
    </MemoryRouter>,
  );

  expect(await screen.findByText('The family list could not be loaded.')).toBeInTheDocument();

  mockState.familyFails = false;
});
