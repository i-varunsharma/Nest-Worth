import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Container from '../components/shared/Container';
import Button from '../components/shared/Button';
import { buildPlan, formatRupees } from '../lib/plan';
import { loadHousehold, saveHousehold } from '../lib/household';

/*
  OnboardingPage
  --------------
  The screen at /onboarding. Someone lands here straight after signing up, and
  comes back to it whenever they press "Edit household" on the dashboard.

  It asks the three questions the model needs, one at a time:

      Step 1  how much you earn
      Step 2  how many people that has to cover
      Step 3  whether an education loan is running

  Asking one thing per screen rather than all three at once is a deliberate
  choice. A short screen feels answerable, and a form with everything on it makes
  people close the tab. It also means each step gets room to explain WHY it is
  being asked, which matters for questions about family money.

  A preview panel on the right updates as the answers change, so the plan is
  never a surprise at the end.
*/

// The slider runs between these two salaries.
const LOWEST_INCOME = 20000;
const HIGHEST_INCOME = 250000;

const TOTAL_STEPS = 3;

export default function OnboardingPage() {
  const navigate = useNavigate();

  // Start from whatever was saved before, so returning to edit shows the
  // current answers rather than blank ones.
  const [household, setHousehold] = useState(loadHousehold());

  // Which question is showing, counting from 1 so it matches "Step 1 of 3".
  const [step, setStep] = useState(1);

  // The live preview beside the questions.
  const plan = buildPlan(household);
  const sliderPercent = ((household.income - LOWEST_INCOME) / (HIGHEST_INCOME - LOWEST_INCOME)) * 100;

  /*
    Each of these builds a brand new household object rather than editing the
    old one. React compares objects by identity, so changing a property in place
    would not tell it anything happened and the screen would not update.

    The three dots are the spread operator: "copy everything from household,
    then replace the one field named after it".
  */
  const handleIncomeChange = (event) => {
    setHousehold({ ...household, income: Number(event.target.value) });
  };

  const handleDependentsChange = (count) => {
    setHousehold({ ...household, dependents: count });
  };

  const handleLoanChange = (hasLoan) => {
    setHousehold({ ...household, hasLoan: hasLoan });
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
      return;
    }

    // Last step: write the answers down and move to the dashboard.
    saveHousehold(household);
    navigate('/dashboard');
  };

  // The label on the forward button changes on the last step.
  let nextLabel = 'Continue';
  if (step === TOTAL_STEPS) {
    nextLabel = 'Build my plan';
  }

  // ---------------------------------------------------------------
  // The question for the current step.
  // ---------------------------------------------------------------
  let question = null;

  if (step === 1) {
    question = (
      <div>
        <h2 className="font-display text-[clamp(1.9rem,3.5vw,2.6rem)] leading-[1.08] tracking-[-0.02em]">
          What lands in your account each month?
        </h2>
        <p className="mt-4 max-w-md text-[15.5px] leading-relaxed text-ink2">
          Take-home pay, after tax and deductions, not your CTC. A rough figure is
          fine. You can change it whenever it changes.
        </p>

        <div className="mt-10">
          <div className="flex items-baseline justify-between">
            <label htmlFor="income" className="text-[13px] font-medium text-ink2">
              Monthly take-home
            </label>
            <span className="tnum font-display text-[32px] leading-none">
              {formatRupees(household.income)}
            </span>
          </div>

          <input
            id="income"
            type="range"
            min={LOWEST_INCOME}
            max={HIGHEST_INCOME}
            step={1000}
            value={household.income}
            onChange={handleIncomeChange}
            style={{ backgroundSize: sliderPercent + '% 100%' }}
            className="range-track mt-5"
          />

          <div className="mt-2 flex justify-between text-2xs text-muted">
            <span>₹20k</span>
            <span>₹2.5L</span>
          </div>
        </div>
      </div>
    );
  }

  if (step === 2) {
    question = (
      <div>
        <h2 className="font-display text-[clamp(1.9rem,3.5vw,2.6rem)] leading-[1.08] tracking-[-0.02em]">
          How many people does it have to cover?
        </h2>
        <p className="mt-4 max-w-md text-[15.5px] leading-relaxed text-ink2">
          Parents you send money to, a sibling still studying, anyone whose costs
          come out of your salary before you spend a rupee on yourself. This is the
          question nobody else asks, and it changes the whole answer.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          {[0, 1, 2, 3].map((count) => {
            const isChosen = household.dependents === count;

            let optionClasses =
              'flex h-16 w-16 items-center justify-center rounded-2xl border text-[20px] font-semibold transition-all duration-300 ease-smooth ';

            if (isChosen === true) {
              optionClasses = optionClasses + 'border-ink bg-ink text-paper';
            } else {
              optionClasses = optionClasses + 'border-line bg-surface text-muted hover:border-ink hover:text-ink';
            }

            return (
              <button
                key={count}
                type="button"
                onClick={() => handleDependentsChange(count)}
                aria-pressed={isChosen}
                className={optionClasses}
              >
                {count}
              </button>
            );
          })}
        </div>

        <p className="mt-5 text-[13px] text-muted">
          Not sure? Count the people who would struggle if your salary stopped.
        </p>
      </div>
    );
  }

  if (step === 3) {
    question = (
      <div>
        <h2 className="font-display text-[clamp(1.9rem,3.5vw,2.6rem)] leading-[1.08] tracking-[-0.02em]">
          Is an education loan still running?
        </h2>
        <p className="mt-4 max-w-md text-[15.5px] leading-relaxed text-ink2">
          Education loans in India usually charge around 11%. That is more than
          the market reliably pays, so if one is running we clear it before putting
          money into investments.
        </p>

        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {[
            { value: true, label: 'Yes, still paying', note: 'We will prioritise clearing it' },
            { value: false, label: 'No loan', note: 'More room to invest early' },
          ].map((option) => {
            const isChosen = household.hasLoan === option.value;

            let optionClasses = 'rounded-2xl border p-5 text-left transition-all duration-300 ease-smooth ';

            if (isChosen === true) {
              optionClasses = optionClasses + 'border-ink bg-ink text-paper';
            } else {
              optionClasses = optionClasses + 'border-line bg-surface text-ink hover:border-ink';
            }

            // The small print needs a paler colour on whichever background it lands on.
            let noteClasses = 'mt-2 block text-[13px] ';
            if (isChosen === true) {
              noteClasses = noteClasses + 'text-paper/60';
            } else {
              noteClasses = noteClasses + 'text-muted';
            }

            // React keys have to be text, and a true/false value is not.
            return (
              <button
                key={String(option.value)}
                type="button"
                onClick={() => handleLoanChange(option.value)}
                aria-pressed={isChosen}
                className={optionClasses}
              >
                <span className="text-[15.5px] font-semibold">{option.label}</span>
                <span className={noteClasses}>{option.note}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <Container className="py-10 lg:py-16">

        {/* ---------- Progress along the top ---------- */}
        <div className="flex items-center justify-between">
          <span className="font-display text-[21px] leading-none tracking-tight">Nestworth</span>
          <span className="text-2xs font-semibold uppercase tracking-widest2 text-muted">
            Step {step} of {TOTAL_STEPS}
          </span>
        </div>

        <div className="mt-4 flex gap-2">
          {[1, 2, 3].map((number) => {
            const isDone = number <= step;

            let segmentClasses = 'h-1 flex-1 rounded-full transition-colors duration-500 ';
            if (isDone === true) {
              segmentClasses = segmentClasses + 'bg-accent';
            } else {
              segmentClasses = segmentClasses + 'bg-line';
            }

            return <span key={number} className={segmentClasses} />;
          })}
        </div>

        {/* ---------- The question, and the live preview ---------- */}
        <div className="mt-16 grid gap-12 lg:grid-cols-[1fr_0.8fr] lg:gap-20">

          <div>
            {question}

            <div className="mt-12 flex items-center gap-3">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="rounded-full border border-line bg-surface px-6 py-3.5 text-[14.5px] font-semibold text-ink transition-all duration-300 ease-smooth hover:border-ink"
                >
                  Back
                </button>
              ) : null}

              <Button onClick={handleNext} variant="accent" arrow>
                {nextLabel}
              </Button>
            </div>
          </div>

          {/* The preview. It is hidden on small screens, where it would push the
              question itself off the top of the display. */}
          <div className="hidden lg:block">
            <div className="sticky top-16 rounded-[26px] border border-line bg-surface p-7 shadow-card">
              <p className="text-2xs font-semibold uppercase tracking-widest2 text-muted">
                Your plan so far
              </p>

              <p className="tnum mt-5 font-display text-[34px] leading-none text-accent">
                {formatRupees(plan.free)}
              </p>
              <p className="mt-2 text-[13px] text-muted">yours to direct each month</p>

              <div className="mt-7 space-y-4 border-t border-lineSoft pt-6">
                {plan.buckets.map((bucket) => {
                  return (
                    <div key={bucket.key} className="flex items-baseline justify-between">
                      <span className="text-[14px] text-ink2">{bucket.label}</span>
                      <span className="tnum text-[14.5px] font-semibold text-ink">
                        {formatRupees(bucket.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <p className="mt-7 border-t border-lineSoft pt-5 text-2xs leading-relaxed text-muted">
                This updates as you answer. Nothing is saved until you finish.
              </p>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
