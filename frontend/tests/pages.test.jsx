import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/*
  Smoke tests for the dashboard and check-in pages: each draws from API data
  without crashing, and shows figures from shared/finances.js. The API module is
  replaced, so nothing here touches the network.
*/

vi.mock('../src/lib/api', () => {
  return {
    getHousehold: async () => {
      return {
        ok: true,
        data: {
          household: {
            income: 85000,
            dependents: 2,
            hasLoan: true,
            incomeVaries: false,
            essentialCosts: 24000,
            chosenPlan: null,
            isSaved: true,
          },
        },
      };
    },
    getDebts: async () => {
      return { ok: true, data: { debts: [{ id: 1, name: 'Card', kind: 'credit_card', principal: 84000, annualRate: 42, emi: 4000 }] } };
    },
    getAssets: async () => {
      return { ok: true, data: { assets: [{ id: 1, name: 'Savings', kind: 'cash', value: 95000 }] } };
    },
    getFamily: async () => {
      return { ok: true, data: { family: [{ id: 1, name: 'Papa', relation: 'parent', monthlySupport: 9000, hasHealthCover: false }] } };
    },
    getGoals: async () => {
      return { ok: true, data: { goals: [] } };
    },
    getCheckins: async () => {
      return { ok: true, data: { checkins: [] } };
    },
    getBriefing: async () => {
      return { ok: true, data: { briefing: { body: '', signals: [], writtenBy: 'rules' } } };
    },
    getInsights: async () => {
      return { ok: true, data: { insights: { summary: { monthsRecorded: 0 }, months: [], bestMonth: null } } };
    },
    saveCheckin: async () => {
      return { ok: true, data: {} };
    },
    askCoach: async () => {},
  };
});


test('the dashboard draws the plan, the headline figures and the stress test', async () => {
  const { default: DashboardPage } = await import('../src/pages/DashboardPage');

  render(
    <MemoryRouter>
      <DashboardPage user={{ name: 'Varun' }} />
    </MemoryRouter>,
  );

  expect(await screen.findByText('Yours to direct this month')).toBeInTheDocument();
  expect(screen.getByText('Safety net')).toBeInTheDocument();
  expect(screen.getByText('shocks survived')).toBeInTheDocument();

  // Papa is listed, so support is the real amount rather than the estimate.
  expect(screen.getByText('Family support')).toBeInTheDocument();
  expect(screen.queryByText(/Estimated: add them on the Family page/)).not.toBeInTheDocument();
});


test('the check-in form starts with the planned income', async () => {
  const { default: CheckInPage } = await import('../src/pages/CheckInPage');

  render(
    <MemoryRouter initialEntries={['/check-in']}>
      <CheckInPage user={{ name: 'Varun' }} />
    </MemoryRouter>,
  );

  expect(await screen.findByLabelText('Income that arrived')).toHaveValue('85000');
  expect(screen.getByText('Nothing recorded yet.', { exact: false })).toBeInTheDocument();
});


test('regression: income from a bank statement is not replaced by the planned income', async () => {
  // The spending page links here with ?income=. The page used to overwrite it
  // with the plan's figure as soon as the plan loaded.
  const { default: CheckInPage } = await import('../src/pages/CheckInPage');

  render(
    <MemoryRouter initialEntries={['/check-in?month=2026-08&income=91234&spent=60000']}>
      <CheckInPage user={{ name: 'Varun' }} />
    </MemoryRouter>,
  );

  expect(await screen.findByLabelText('Income that arrived')).toHaveValue('91234');
  expect(screen.getByLabelText('Spent')).toHaveValue('60000');
});
