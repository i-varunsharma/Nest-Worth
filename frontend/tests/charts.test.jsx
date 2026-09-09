import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AllocationBar from '../src/components/charts/AllocationBar';
import ScenarioLines from '../src/components/charts/ScenarioLines';
import SafetyMeter from '../src/components/charts/SafetyMeter';
import DebtDumbbell from '../src/components/charts/DebtDumbbell';

/*
  Tests for the charts. Run with: npm test

  A chart fails differently from other code. It does not throw: it draws
  something, and the something is wrong. A width of NaN% collapses a bar to
  nothing, a share over 100 pushes a segment off the side of the card, and a
  path with NaN in it makes an SVG line vanish entirely with no error anywhere.

  Every one of those looks like "the chart did not load" and none of them
  appears in a console. So these tests read the geometry that was actually
  produced and check it is inside the box.

  What they cannot check is whether it looks right. jsdom has no layout engine,
  so nothing here can say a label collided with another one or that the tooltip
  ran off the edge. That still needs somebody to open the page.
*/

const allocation = {
  committed: 55700,
  spend: 14650,
  save: 11134,
  invest: 3516,
  extraToDebt: 0,
};

const INCOME = 85000;

/* Two plans, enough for the comparison chart to have something to compare. */
const scenarios = [
  {
    key: 'balanced',
    name: 'Your plan as it stands',
    idea: 'The split the app already recommends.',
    allocation: allocation,
    outcomes: {
      monthsCoveredInAYear: 4.9,
      debtFreeMonths: 73,
      debtFreeDate: new Date('2032-10-01'),
      investedAfterYears: 1970000,
      valueAfterYears: 4086669,
      cashAfterYears: 900000,
      totalAfterYears: 4986669,
    },
    rows: [
      { year: 0, invested: 0, value: 0, cash: 0, total: 0, debtLeft: 494000 },
      { year: 1, invested: 130000, value: 138000, cash: 60000, total: 198000, debtLeft: 420000 },
      { year: 2, invested: 260000, value: 292000, cash: 120000, total: 412000, debtLeft: 340000 },
    ],
  },
  {
    key: 'debt',
    name: 'Clear the expensive debt first',
    idea: 'Send the investing money at the card.',
    allocation: { ...allocation, invest: 0, save: 5567, extraToDebt: 9083 },
    outcomes: {
      monthsCoveredInAYear: 3.5,
      debtFreeMonths: 34,
      debtFreeDate: new Date('2029-07-01'),
      investedAfterYears: 1760000,
      valueAfterYears: 3976187,
      cashAfterYears: 450000,
      totalAfterYears: 4426187,
    },
    rows: [
      { year: 0, invested: 0, value: 0, cash: 0, total: 0, debtLeft: 494000 },
      { year: 1, invested: 0, value: 0, cash: 30000, total: 30000, debtLeft: 300000 },
      { year: 2, invested: 90000, value: 94000, cash: 60000, total: 154000, debtLeft: 120000 },
    ],
  },
];


/* Pulls every inline width/left percentage out of the rendered markup. */
function percentagesIn(container) {
  const found = [];

  container.querySelectorAll('[style]').forEach((node) => {
    const style = node.getAttribute('style');
    const matches = style.match(/(?:width|left|right):\s*([\d.]+)%/g);

    if (matches) {
      matches.forEach((match) => {
        found.push(Number(match.replace(/[^\d.]/g, '')));
      });
    }
  });

  return found;
}


// ---------------------------------------------------------------
// Where the money goes
// ---------------------------------------------------------------

test('the allocation bar draws every segment inside the bar', () => {
  const { container } = render(<AllocationBar allocation={allocation} income={INCOME} />);

  const widths = percentagesIn(container);

  // Four segments, and the four shares are the whole income.
  expect(widths.length).toBe(4);

  let total = 0;
  widths.forEach((width) => {
    expect(Number.isFinite(width)).toBe(true);
    expect(width).toBeGreaterThan(0);
    expect(width).toBeLessThanOrEqual(100);
    total = total + width;
  });

  // Allowing a rounding crumb, the segments fill the bar exactly once.
  expect(Math.abs(total - 100)).toBeLessThan(0.5);
});


test('the allocation bar always has a legend', () => {
  /*
    Colour alone is not an identity channel. Somebody who cannot tell the slate
    from the brass has nothing else to go on, so the legend is not optional and
    is not something to add later.
  */
  render(<AllocationBar allocation={allocation} income={INCOME} />);

  expect(screen.getByText('Already committed')).toBeInTheDocument();
  expect(screen.getByText('Spend')).toBeInTheDocument();
  expect(screen.getByText('Save')).toBeInTheDocument();
  expect(screen.getByText('Invest')).toBeInTheDocument();
});


test('a zero bucket is left out rather than drawn as a sliver', () => {
  const noInvesting = { ...allocation, invest: 0 };

  const { container } = render(<AllocationBar allocation={noInvesting} income={INCOME} />);

  expect(percentagesIn(container).length).toBe(3);
  expect(screen.queryByText('Invest')).toBe(null);
});


test('an income of zero does not produce NaN widths', () => {
  // Nothing in the app should allow this, which is exactly why it is worth
  // checking: a divide by zero here would collapse the whole bar silently.
  const { container } = render(<AllocationBar allocation={allocation} income={0} />);

  percentagesIn(container).forEach((width) => {
    expect(Number.isFinite(width)).toBe(true);
  });
});


// ---------------------------------------------------------------
// The comparison lines
// ---------------------------------------------------------------

test('every line is drawn with real coordinates', () => {
  /*
    A single NaN anywhere in an SVG path makes the entire line disappear, with
    no error in the console and nothing on screen to say why. It is the most
    common way a chart "does not load".
  */
  const { container } = render(
    <ScenarioLines scenarios={scenarios} activeKey="balanced" />,
  );

  const paths = container.querySelectorAll('path');

  expect(paths.length).toBe(scenarios.length);

  paths.forEach((path) => {
    const d = path.getAttribute('d');

    expect(d).not.toMatch(/NaN|Infinity|undefined/);
    expect(d.length).toBeGreaterThan(0);
  });
});


test('all the lines share one scale', () => {
  /*
    Every line has to be measured against the same tallest value, or each plan
    looks identically successful and the comparison the page exists for is
    meaningless.

    Both scenarios start at zero, so both paths must begin at the same y.
  */
  const { container } = render(
    <ScenarioLines scenarios={scenarios} activeKey="balanced" />,
  );

  const starts = [];

  container.querySelectorAll('path').forEach((path) => {
    starts.push(path.getAttribute('d').split(' ')[0]);
  });

  expect(starts[0]).toBe(starts[1]);
});


test('the comparison chart has a legend and an accessible name', () => {
  render(<ScenarioLines scenarios={scenarios} activeKey="balanced" />);

  expect(screen.getByText('The plan you are reading')).toBeInTheDocument();
  expect(screen.getByText('The others, for comparison')).toBeInTheDocument();

  // A screen reader gets a description rather than an unlabelled graphic.
  expect(screen.getByRole('img')).toHaveAttribute('aria-label');
});


test('hovering the chart reads the year under the pointer', async () => {
  /*
    jsdom has no layout, so every element reports a width of zero and the chart
    cannot turn a pointer position into a year. The box is stubbed here to give
    it one.

    That stub is what makes this a real test rather than a coincidence. Without
    it the code divides by zero, the year comes out NaN, and the tooltip either
    vanishes or lands on whatever the clamp happens to allow. With a 600px box,
    halfway across is genuinely the middle year and the assertion below means
    something.
  */
  const user = userEvent.setup();

  const { container } = render(
    <ScenarioLines scenarios={scenarios} activeKey="balanced" />,
  );

  const plot = container.querySelector('.relative');

  plot.getBoundingClientRect = () => {
    return { left: 0, top: 0, width: 600, height: 260, right: 600, bottom: 260 };
  };

  // Nothing before the pointer arrives.
  expect(screen.queryByText(/After \d+ years|^Today$/)).toBe(null);

  // The rows run 0 to 2, so the far right is year 2.
  await user.pointer({ target: plot, coords: { clientX: 600, clientY: 10 } });

  expect(screen.getByText('After 2 years')).toBeInTheDocument();

  // Both plans are named, so the tooltip compares rather than merely reporting.
  expect(screen.getByText('Your plan as it stands')).toBeInTheDocument();
  expect(screen.getByText('Clear the expensive debt first')).toBeInTheDocument();

  await user.unhover(plot);

  expect(screen.queryByText('After 2 years')).toBe(null);
});


test('a chart with no width on screen draws no crosshair rather than a broken one', async () => {
  // The guard this covers is one line, and without it the crosshair is drawn at
  // NaN: it disappears with nothing in the console to say why.
  const user = userEvent.setup();

  const { container } = render(
    <ScenarioLines scenarios={scenarios} activeKey="balanced" />,
  );

  const plot = container.querySelector('.relative');

  await user.pointer({ target: plot, coords: { clientX: 10, clientY: 10 } });

  container.querySelectorAll('line').forEach((line) => {
    expect(line.getAttribute('x1')).not.toMatch(/NaN/);
  });
});


test('an empty list draws nothing rather than crashing', () => {
  const { container } = render(<ScenarioLines scenarios={[]} activeKey="balanced" />);

  expect(container.querySelectorAll('path').length).toBe(0);
});


// ---------------------------------------------------------------
// The safety net meter
// ---------------------------------------------------------------

test('the meter fill never runs past the end of its track', () => {
  // Somebody with twenty months of cover against a six month target would
  // otherwise be drawn at 333%, which pushes the fill out of the card.
  const { container } = render(<SafetyMeter monthsCovered={20} monthsTarget={6} />);

  percentagesIn(container).forEach((value) => {
    expect(value).toBeLessThanOrEqual(100);
    expect(value).toBeGreaterThanOrEqual(0);
  });
});


test('the meter says whether the target is met, in words', () => {
  /*
    The number and the bar both need reading. The sentence is what makes the
    chart answer "is that good?", which is the only question it is there for.
  */
  render(<SafetyMeter monthsCovered={7} monthsTarget={6} />);
  expect(screen.getByText(/Past the 6 months/)).toBeInTheDocument();

  render(<SafetyMeter monthsCovered={2.5} monthsTarget={6} />);
  expect(screen.getByText(/3.5 months short/)).toBeInTheDocument();
});


// ---------------------------------------------------------------
// The debt dumbbell
// ---------------------------------------------------------------

test('the dumbbell places every dot inside the row', () => {
  const { container } = render(
    <DebtDumbbell scenarios={scenarios} activeKey="debt" />,
  );

  percentagesIn(container).forEach((value) => {
    expect(Number.isFinite(value)).toBe(true);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(100);
  });
});


test('the dumbbell says how much sooner, not just when', () => {
  // 73 months against 34 is 39 months, which is three years and three months.
  render(<DebtDumbbell scenarios={scenarios} activeKey="debt" />);

  expect(screen.getByText(/3 years 3 months sooner/)).toBeInTheDocument();
});


test('the dumbbell draws nothing when there is no debt to compare', () => {
  // A dumbbell with both ends in the same place is a bar of zero length
  // pretending to be information.
  const noDebt = scenarios.map((scenario) => {
    return { ...scenario, outcomes: { ...scenario.outcomes, debtFreeMonths: 0 } };
  });

  const { container } = render(<DebtDumbbell scenarios={noDebt} activeKey="balanced" />);

  expect(container.firstChild).toBe(null);
});


test('a debt that never clears is said in words, not drawn as a dot', () => {
  const neverClears = [
    scenarios[0],
    { ...scenarios[1], outcomes: { ...scenarios[1].outcomes, debtFreeMonths: null } },
  ];

  render(<DebtDumbbell scenarios={neverClears} activeKey="balanced" />);

  expect(screen.getByText(/does not clear within 15 years/)).toBeInTheDocument();
});


// ---------------------------------------------------------------
// The page itself
// ---------------------------------------------------------------

/*
  A smoke test for /plans.

  The charts are covered above. What this catches is the page around them: the
  date coming back from the API as a string and being turned back into a Date,
  the baseline lookup, the difference against it. Any of those throwing takes
  the whole screen down, and none of them is exercised by testing a chart on
  its own.

  The API module is replaced so nothing here touches the network.
*/
vi.mock('../src/lib/api', () => {
  return {
    // The page reads the household too, to find out which plan is being
    // followed, so it can open on that one.
    getHousehold: async () => {
      return { ok: true, data: { household: { chosenPlan: null } } };
    },

    choosePlan: async (plan) => {
      return { ok: true, data: { household: { chosenPlan: plan } } };
    },

    getScenarios: async () => {
      return {
        ok: true,
        data: {
          today: {
            income: 85000,
            monthlyCosts: 46350,
            liquidSavings: 95000,
            monthsCovered: 2,
            monthsTarget: 6,
            debtCount: 1,
            totalOwed: 84000,
          },
          // Dates arrive as strings, the way JSON delivers them, not as Dates.
          scenarios: scenarios.map((one) => {
            return {
              ...one,
              outcomes: {
                ...one.outcomes,
                debtFreeDate: one.outcomes.debtFreeDate.toISOString(),
              },
            };
          }),
        },
      };
    },
  };
});

test('the plans page draws without crashing, and can switch plan', async () => {
  const { default: PlansPage } = await import('../src/pages/PlansPage');
  const { MemoryRouter } = await import('react-router-dom');

  const user = userEvent.setup();

  render(
    <MemoryRouter>
      <PlansPage user={{ name: 'Varun' }} />
    </MemoryRouter>,
  );

  /*
    The heading counts the plans it was actually given.

    It used to say "four ways" whatever the number was, so somebody with no
    debts, who is never offered the debt plan, saw three options under a
    heading promising four. The fixture here has two.
  */
  expect(await screen.findByText('The same money, two ways.')).toBeInTheDocument();

  // The date from the API survived the trip through JSON and back.
  expect(screen.getByText(/Debt free by/)).toBeInTheDocument();

  // Every plan is offered, and the first is selected.
  const chooser = screen.getByRole('button', { name: 'Clear the expensive debt first' });

  expect(screen.getByRole('button', { name: 'Your plan as it stands' }))
    .toHaveAttribute('aria-pressed', 'true');

  await user.click(chooser);

  expect(chooser).toHaveAttribute('aria-pressed', 'true');

  // The table is always there, so nothing on this page is available only as a
  // picture.
  expect(screen.getByText('All of it, as numbers')).toBeInTheDocument();
});


test('regression: a short chart does not draw the same year label twice', () => {
  /*
    The four year labels are worked out as quarters of the span. Over fifteen
    years those are 0, 5, 10 and 15. Over two they round to 0, 1, 1 and 2, and
    React drops one of the duplicates and warns about it.

    The fixture rows run 0 to 2, which is exactly that case.
  */
  const { container } = render(
    <ScenarioLines scenarios={scenarios} activeKey="balanced" />,
  );

  const labels = [];

  container.querySelectorAll('text').forEach((node) => {
    const text = node.textContent;

    // The year labels are the ones along the bottom: "today" and "Ny".
    if (text === 'today' || /^\d+y$/.test(text)) {
      labels.push(text);
    }
  });

  const unique = new Set(labels);

  expect(labels.length).toBe(unique.size);
});


test('following a plan is a separate step from reading one', async () => {
  /*
    Clicking through the plans must not change anything outside the page. Only
    the button commits, and until it is pressed the dashboard carries on
    showing the recommended split.
  */
  const { default: PlansPage } = await import('../src/pages/PlansPage');
  const { MemoryRouter } = await import('react-router-dom');

  const user = userEvent.setup();

  render(
    <MemoryRouter>
      <PlansPage user={{ name: 'Varun' }} />
    </MemoryRouter>,
  );

  await screen.findByText('The same money, two ways.');

  // Reading a different plan does not follow it.
  await user.click(screen.getByRole('button', { name: /Clear the expensive debt first/ }));

  expect(screen.getByRole('button', { name: 'Follow this plan' })).toBeInTheDocument();

  // Pressing the button does, and the button then offers the way back out.
  await user.click(screen.getByRole('button', { name: 'Follow this plan' }));

  expect(await screen.findByRole('button', { name: 'Stop following' })).toBeInTheDocument();
  expect(screen.getByText('This is the plan your dashboard is showing.')).toBeInTheDocument();
});
