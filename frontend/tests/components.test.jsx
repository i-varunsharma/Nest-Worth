import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import TextField from '../src/components/shared/TextField';
import DebtCard from '../src/components/app/DebtCard';
import DebtForm from '../src/components/app/DebtForm';
import ConsistencyCard from '../src/components/app/ConsistencyCard';
import ErrorBoundary from '../src/components/shared/ErrorBoundary';

/*
  Tests that render real components and poke at them. Run with: npm test

  The other test file checks the maths. This one checks that the maths reaches
  the screen, which is a separate question: payoff() can be perfectly correct
  while the card above it prints the wrong field.

  These run in jsdom, a fake browser. It can say what was rendered and what
  happens when something is clicked. It cannot say whether anything looks right,
  so there is no point asserting on colours or spacing here.

  Two habits worth copying from the tests below.

  Find things the way a person would. getByRole('button', { name: 'Save' })
  finds what somebody looking for a Save button would find. Searching for a CSS
  class instead would pass even if the button were invisible or unlabelled.

  Several of these are marked "regression" and describe bugs that were really
  here. Those are the ones earning their keep.
*/


// Components that contain a Link need a router above them, or React Router
// throws. MemoryRouter keeps its history in memory instead of the address bar.
function renderWithRouter(element) {
  return render(<MemoryRouter>{element}</MemoryRouter>);
}


// ---------------------------------------------------------------
// TextField, which every form on the site is built from
// ---------------------------------------------------------------

test('TextField reports what is typed, one character at a time', async () => {
  const user = userEvent.setup();
  const typed = [];

  render(
    <TextField
      id="name"
      label="Your name"
      type="text"
      value=""
      onChange={(text) => typed.push(text)}
    />,
  );

  await user.type(screen.getByLabelText('Your name'), 'abc');

  // The value prop never changes here, so each keystroke reports a single
  // character. What matters is that onChange gets plain text rather than the
  // browser event, which is the contract the pages rely on.
  expect(typed).toEqual(['a', 'b', 'c']);
});


test('TextField shows an error under the box and hides the hint', () => {
  render(
    <TextField
      id="email"
      label="Email"
      type="email"
      value=""
      onChange={() => {}}
      error="That does not look like an email address."
      hint="We never share it."
    />,
  );

  expect(screen.getByText('That does not look like an email address.')).toBeInTheDocument();

  // The hint gives way to the error rather than both crowding in.
  expect(screen.queryByText('We never share it.')).not.toBeInTheDocument();
});


test('TextField can reveal and re-hide a password', async () => {
  const user = userEvent.setup();

  render(
    <TextField id="password" label="Password" type="password" value="hunter2" onChange={() => {}} />,
  );

  const box = screen.getByLabelText('Password');

  // Hidden to begin with.
  expect(box).toHaveAttribute('type', 'password');

  await user.click(screen.getByRole('button', { name: 'Show' }));
  expect(box).toHaveAttribute('type', 'text');

  await user.click(screen.getByRole('button', { name: 'Hide' }));
  expect(box).toHaveAttribute('type', 'password');
});


// ---------------------------------------------------------------
// DebtCard
// ---------------------------------------------------------------

const clearingDebt = {
  id: 1,
  name: 'Car loan',
  kind: 'vehicle',
  principal: 300000,
  annualRate: 9.5,
  emi: 9000,
};

test('DebtCard shows a payoff date and the interest a normal loan costs', () => {
  render(<DebtCard debt={clearingDebt} isPriority={false} onEdit={() => {}} onDelete={() => {}} />);

  expect(screen.getByText('Car loan')).toBeInTheDocument();

  // "Clear by" holds a real month and year rather than a dash.
  const clearBy = screen.getByText('Clear by').parentElement;
  expect(clearBy).toHaveTextContent(/\w+ \d{4}/);

  /*
    The sentence about cost, checked as a whole rather than by searching the
    page for "₹0". The slider below starts at ₹0 and would match that search,
    which is exactly the kind of false pass that makes a test worthless.
  */
  const costLine = screen.getByText(/in interest/).closest('p');
  expect(costLine).toHaveTextContent(/left\./);
  expect(costLine).not.toHaveTextContent('₹0 ');
});


test('regression: DebtCard is honest about a debt that never clears', () => {
  /*
    An EMI a rupee above the interest reduces the balance so slowly that fifty
    years later most of it is still owing. payoff() returns zeros for months and
    interest in that case, and the card used to print them anyway, reading:

      "now left. If nothing changes you will pay ₹0 in interest"

    for a loan going nowhere. The backend accepts this debt, so a real person
    could reach it.
  */
  const hopeless = { ...clearingDebt, name: 'Barely covered', principal: 1000000, annualRate: 12, emi: 10001 };

  render(<DebtCard debt={hopeless} isPriority={false} onEdit={() => {}} onDelete={() => {}} />);

  // No invented payoff date.
  expect(screen.getByText('50+ yrs')).toBeInTheDocument();

  // It says how much would still be owing, rather than claiming zero interest.
  const costLine = screen.getByText(/still be/).closest('p');
  expect(costLine).toHaveTextContent(/owing/);
  expect(costLine).not.toHaveTextContent(/now left/);
  expect(costLine).not.toHaveTextContent('₹0 ');
});


test('DebtCard asks before deleting', async () => {
  const user = userEvent.setup();
  let deleted = false;

  render(
    <DebtCard
      debt={clearingDebt}
      isPriority={false}
      onEdit={() => {}}
      onDelete={() => { deleted = true; }}
    />,
  );

  await user.click(screen.getByRole('button', { name: 'Delete' }));

  // The first press only asks. A list of debts should not be lost to a stray
  // click on a small screen.
  expect(deleted).toBe(false);

  await user.click(screen.getByRole('button', { name: 'Really delete' }));
  expect(deleted).toBe(true);
});


// ---------------------------------------------------------------
// DebtForm
// ---------------------------------------------------------------

test('DebtForm previews the payoff as the numbers are typed', async () => {
  const user = userEvent.setup();

  renderWithRouter(<DebtForm onSave={() => ({ ok: true })} onCancel={() => {}} />);

  await user.type(screen.getByLabelText('What is it?'), 'Car loan');
  await user.type(screen.getByLabelText(/still owed/i), '300000');
  await user.clear(screen.getByLabelText(/rate/i));
  await user.type(screen.getByLabelText(/rate/i), '9.5');
  await user.type(screen.getByLabelText(/emi/i), '9000');

  expect(await screen.findByText(/clears in/)).toBeInTheDocument();
});


test('regression: DebtForm tells the two kinds of failure apart', async () => {
  /*
    A loan can fail to clear two ways, and the form used to assume the first.
    On the second it printed "that EMI is smaller than the interest", which is
    false, and worked out a suggested EMI from an undefined, printing ₹NaN.
  */
  const user = userEvent.setup();

  renderWithRouter(<DebtForm onSave={() => ({ ok: true })} onCancel={() => {}} />);

  const principal = screen.getByLabelText(/still owed/i);
  const rate = screen.getByLabelText(/rate/i);
  const emi = screen.getByLabelText(/emi/i);

  // Below the interest: the balance grows.
  await user.type(principal, '100000');
  await user.clear(rate);
  await user.type(rate, '40');
  await user.type(emi, '100');

  expect(await screen.findByText(/smaller than the interest/)).toBeInTheDocument();

  // Just above it: the balance falls, but far too slowly.
  await user.clear(principal);
  await user.type(principal, '1000000');
  await user.clear(rate);
  await user.type(rate, '12');
  await user.clear(emi);
  await user.type(emi, '10001');

  expect(await screen.findByText(/more than fifty\s*years/)).toBeInTheDocument();
  expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
});


test('DebtForm starts filled in when editing, and blank when adding', () => {
  const { unmount } = renderWithRouter(
    <DebtForm debt={clearingDebt} onSave={() => ({ ok: true })} onCancel={() => {}} />,
  );

  expect(screen.getByLabelText('What is it?')).toHaveValue('Car loan');
  expect(screen.getByLabelText(/still owed/i)).toHaveValue('300000');

  unmount();

  renderWithRouter(<DebtForm onSave={() => ({ ok: true })} onCancel={() => {}} />);
  expect(screen.getByLabelText('What is it?')).toHaveValue('');
});


test('regression: a form given a different debt shows the new one', () => {
  /*
    The bug this guards against was the worst one in the project.

    A form's useState only reads its starting values once, when it first
    appears. Pressing Edit on one debt and then Edit on another kept the first
    debt's numbers in the boxes while saving them against the second debt's id,
    silently overwriting the wrong record.

    The fix is a key that changes with the target, which tells React this is a
    different form and it has to be rebuilt. This test renders the way the page
    does, with that key, and re-renders with another debt.
  */
  const second = { ...clearingDebt, id: 2, name: 'Personal loan', principal: 50000 };

  const { rerender } = render(
    <MemoryRouter>
      <DebtForm key={'debt-' + clearingDebt.id} debt={clearingDebt} onSave={() => {}} onCancel={() => {}} />
    </MemoryRouter>,
  );

  expect(screen.getByLabelText('What is it?')).toHaveValue('Car loan');

  rerender(
    <MemoryRouter>
      <DebtForm key={'debt-' + second.id} debt={second} onSave={() => {}} onCancel={() => {}} />
    </MemoryRouter>,
  );

  expect(screen.getByLabelText('What is it?')).toHaveValue('Personal loan');
  expect(screen.getByLabelText(/still owed/i)).toHaveValue('50000');
});


// ---------------------------------------------------------------
// ConsistencyCard
// ---------------------------------------------------------------

test('ConsistencyCard invites a first month when nothing is recorded', () => {
  renderWithRouter(<ConsistencyCard summary={null} plannedKeptShare={30} />);

  expect(screen.getByText(/Nothing recorded yet/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Record your first month/ })).toBeInTheDocument();
});


test('ConsistencyCard says when the plan is being met', () => {
  const summary = {
    count: 3,
    totalKept: 90000,
    averageKeptShare: 31,
    isMeetingPlan: true,
    trend: 'unknown',
    bestMonth: '2026-08',
    bestShare: 35,
  };

  renderWithRouter(<ConsistencyCard summary={summary} plannedKeptShare={30} />);

  expect(screen.getByText(/keeping what the plan asks for/)).toBeInTheDocument();
  expect(screen.getByText(/August 2026/)).toBeInTheDocument();

  // Three months is not enough to claim a direction.
  expect(screen.queryByText(/recent months/)).not.toBeInTheDocument();
});


test('ConsistencyCard claims a trend only from four months', () => {
  const summary = {
    count: 6,
    totalKept: 200000,
    averageKeptShare: 20,
    isMeetingPlan: false,
    trend: 'improving',
    bestMonth: '2026-08',
    bestShare: 30,
  };

  renderWithRouter(<ConsistencyCard summary={summary} plannedKeptShare={30} />);

  expect(screen.getByText(/recent months are better/)).toBeInTheDocument();

  // Falling short is reported without scolding.
  const verdict = screen.getByText(/points under the plan/);
  expect(verdict).toHaveTextContent(/plan is too tight/);
});


// ---------------------------------------------------------------
// The error boundary
// ---------------------------------------------------------------

test('a crash inside a page shows a message instead of a blank screen', () => {
  /*
    When a component throws while rendering, React removes the whole tree
    rather than leave a half-drawn page up. Without a boundary the result is a
    completely white browser window, which is the worst thing to show somebody
    looking at their own finances.

    The error is expected here, so the console is quietened for the duration.
    Otherwise React prints the whole stack and a passing run looks like a
    failing one.
  */
  const realError = console.error;
  console.error = () => {};

  function Exploding() {
    throw new Error('deliberate, for the test');
  }

  try {
    render(
      <ErrorBoundary>
        <Exploding />
      </ErrorBoundary>,
    );

    expect(screen.getByText('This page stopped working.')).toBeInTheDocument();

    // It has to offer a way out. A dead end is only slightly better than a
    // blank page.
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
  } finally {
    console.error = realError;
  }
});


test('the boundary stays out of the way when nothing is wrong', () => {
  render(
    <ErrorBoundary>
      <p>the real page</p>
    </ErrorBoundary>,
  );

  expect(screen.getByText('the real page')).toBeInTheDocument();
});
