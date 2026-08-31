import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Container from '../components/shared/Container';
import Button from '../components/shared/Button';
import TextField from '../components/shared/TextField';
import * as api from '../lib/api';
import { buildPlan, formatRupees } from '../lib/plan';
import { DEFAULT_HOUSEHOLD } from '../lib/household';

/*
  The screen at /onboarding. People arrive here straight after signing up, and
  come back whenever they press "Edit household" on the dashboard.

  It asks one question per screen. That is deliberate: a short screen feels
  answerable, a form with everything on it makes people close the tab, and one
  question at a time leaves room to explain WHY it is being asked, which matters
  when the subject is family money.

  Somebody who signed up with a phone number has no name yet, so for them there
  is an extra question at the front. That is why the list of steps is built at
  the top rather than written out: the flow is four screens for some people and
  three for others.

  Props:
    user - the signed-in person, handed down by RequireAuth
*/

const LOWEST_INCOME = 20000;
const HIGHEST_INCOME = 250000;

export default function OnboardingPage({ user }) {
  const navigate = useNavigate();

  // Which question is showing, counting from 0 so it matches the steps array.
  const [stepIndex, setStepIndex] = useState(0);

  const [name, setName] = useState(user.name || '');
  const [household, setHousehold] = useState(DEFAULT_HOUSEHOLD);

  const [nameError, setNameError] = useState('');
  const [formError, setFormError] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  /*
    Load whatever was saved before, so coming back to edit shows the current
    answers rather than blank ones.

    The stillMounted flag guards against the answer arriving after this page has
    already been left, which would otherwise try to update state that is gone.
  */
  useEffect(() => {
    let stillMounted = true;

    api.getHousehold().then((result) => {
      if (!stillMounted) {
        return;
      }

      if (result.ok) {
        setHousehold({
          income: result.data.household.income,
          dependents: result.data.household.dependents,
          hasLoan: result.data.household.hasLoan,
          incomeVaries: result.data.household.incomeVaries,
          essentialCosts: result.data.household.essentialCosts,
        });
      }

      setIsLoading(false);
    });

    return () => {
      stillMounted = false;
    };
  }, []);

  // Build the list of questions. Only ask for a name if we do not have one.
  const steps = [];
  if (!user.name) {
    steps.push('name');
  }
  steps.push('income');
  steps.push('costs');
  steps.push('steady');
  steps.push('dependents');
  steps.push('loan');

  const currentStep = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;

  // The live preview beside the questions.
  const plan = buildPlan(household);
  const sliderPercent = ((household.income - LOWEST_INCOME) / (HIGHEST_INCOME - LOWEST_INCOME)) * 100;

  /*
    Each of these builds a brand new household object rather than editing the
    old one. React compares objects by identity, so changing a property in place
    would not tell it anything happened and the screen would not update.

    The three dots are the spread operator: "copy everything from household,
    then replace the field named after it".
  */
  const handleIncomeChange = (event) => {
    const income = Number(event.target.value);

    // The living-costs slider on the next step is capped at 70% of income, so
    // lowering the income here has to bring the stored figure back under it.
    const highest = Math.round(income * 0.7);

    let essentialCosts = household.essentialCosts;
    if (essentialCosts > highest) {
      essentialCosts = highest;
    }

    setHousehold({ ...household, income: income, essentialCosts: essentialCosts });
  };

  const handleDependentsChange = (count) => {
    setHousehold({ ...household, dependents: count });
  };

  const handleEssentialCostsChange = (event) => {
    setHousehold({ ...household, essentialCosts: Number(event.target.value) });
  };

  const handleIncomeVariesChange = (incomeVaries) => {
    // A new object rather than editing the old one, because React compares by
    // identity and will not re-render if you change the object it already has.
    setHousehold({ ...household, incomeVaries: incomeVaries });
  };

  const handleLoanChange = (hasLoan) => {
    setHousehold({ ...household, hasLoan: hasLoan });
  };

  const handleBack = () => {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
    }
  };

  const handleNext = async () => {
    setFormError('');

    // The name step will not let you past it empty.
    if (currentStep === 'name') {
      if (name.trim().length < 2) {
        setNameError('Please enter your name.');
        return;
      }
      setNameError('');
    }

    if (!isLastStep) {
      setStepIndex(stepIndex + 1);
      return;
    }

    // Last step: save everything, then go to the plan.
    setIsSaving(true);

    // A new name only needs saving if one was actually asked for.
    if (steps.includes('name')) {
      const nameResult = await api.saveName(name);

      if (!nameResult.ok) {
        setIsSaving(false);
        setFormError(nameResult.error);
        return;
      }
    }

    const result = await api.saveHousehold(household);

    setIsSaving(false);

    if (!result.ok) {
      setFormError(result.error);
      return;
    }

    navigate('/dashboard');
  };

  if (isLoading === true) {
    return (
      <div className="grid min-h-screen place-items-center bg-paper">
        <p className="text-[14px] text-muted">Loading…</p>
      </div>
    );
  }

  let nextLabel = 'Continue';
  if (isLastStep === true) {
    nextLabel = 'Build my plan';
  }
  if (isSaving === true) {
    nextLabel = 'Saving…';
  }

  // ---------------------------------------------------------------
  // The question for the current step.
  // ---------------------------------------------------------------
  let question = null;

  if (currentStep === 'name') {
    question = (
      <div>
        <h2 className="font-display text-[clamp(1.9rem,3.5vw,2.6rem)] leading-[1.08] tracking-[-0.02em]">
          First, what should we call you?
        </h2>
        <p className="mt-4 max-w-md text-[15.5px] leading-relaxed text-ink2">
          You signed in with your number, so we do not have a name yet.
        </p>

        <div className="mt-10 max-w-sm">
          <TextField
            id="name"
            label="Your name"
            type="text"
            value={name}
            onChange={setName}
            error={nameError}
            placeholder="Varun Sharma"
            autoComplete="name"
          />
        </div>
      </div>
    );
  }

  if (currentStep === 'income') {
    question = (
      <div>
        <h2 className="font-display text-[clamp(1.9rem,3.5vw,2.6rem)] leading-[1.08] tracking-[-0.02em]">
          What lands in your account each month?
        </h2>
        <p className="mt-4 max-w-md text-[15.5px] leading-relaxed text-ink2">
          Take-home pay, after tax and deductions, not your CTC. A rough figure is
          fine. You can change it whenever it changes.
        </p>

        <div className="mt-10 max-w-lg">
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

  if (currentStep === 'dependents') {
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

  if (currentStep === 'costs') {
    /*
      The slider stops at 70% of income. Living costs at or above the whole
      salary is a data entry mistake rather than a household, and the server
      refuses it, so there is no reason to let the slider reach it.
    */
    const highestCosts = Math.round(household.income * 0.7);

    let costsPercent = 0;
    if (highestCosts > 0) {
      costsPercent = (household.essentialCosts / highestCosts) * 100;
    }

    // What is left once these are paid, shown live so the trade-off is visible
    // while the slider is being dragged.
    const leftOver = household.income - household.essentialCosts;

    question = (
      <div>
        <h2 className="font-display text-[clamp(1.9rem,3.5vw,2.6rem)] leading-[1.08] tracking-[-0.02em]">
          What has to be paid every month?
        </h2>
        <p className="mt-4 max-w-md text-[15.5px] leading-relaxed text-ink2">
          Rent, food, transport, bills and anything else that arrives whether you
          want it to or not. A rough figure is fine. This is the difference between
          a plan built for you and one built for an average that does not exist.
        </p>

        <div className="mt-10 max-w-lg">
          <div className="flex items-baseline justify-between">
            <label htmlFor="costs" className="text-[13px] font-medium text-ink2">
              Rent, food and bills
            </label>
            <span className="tnum font-display text-[30px] leading-none">
              {formatRupees(household.essentialCosts)}
            </span>
          </div>

          <input
            id="costs"
            type="range"
            min={0}
            max={highestCosts}
            step={500}
            value={household.essentialCosts}
            onChange={handleEssentialCostsChange}
            style={{ backgroundSize: costsPercent + '% 100%' }}
            className="range-track mt-4"
          />

          <div className="mt-2 flex justify-between text-2xs text-muted">
            <span>Nothing fixed</span>
            <span>{formatRupees(highestCosts)}</span>
          </div>

          <p className="mt-6 rounded-xl border border-line bg-paperDeep px-4 py-3.5 text-[13.5px] text-ink2">
            That leaves{' '}
            <span className="tnum font-semibold text-ink">{formatRupees(leftOver)}</span>{' '}
            before your household support and any loan.
          </p>
        </div>

        <p className="mt-5 text-[13px] text-muted">
          Guessing high is safer than guessing low. A plan you can actually keep to
          beats one that looks impressive for a fortnight.
        </p>
      </div>
    );
  }

  if (currentStep === 'steady') {
    const steadyOptions = [
      {
        value: false,
        label: 'About the same',
        note: 'A salary that arrives on a date',
      },
      {
        value: true,
        label: 'It moves around',
        note: 'Freelance, commission, or a business',
      },
    ];

    question = (
      <div>
        <h2 className="font-display text-[clamp(1.9rem,3.5vw,2.6rem)] leading-[1.08] tracking-[-0.02em]">
          Is that roughly the same every month?
        </h2>
        <p className="mt-4 max-w-md text-[15.5px] leading-relaxed text-ink2">
          Most advice quietly assumes a salary that either arrives or stops. If yours
          moves around, a thin month is a normal event rather than an emergency, so we
          hold more of your money in cash you can reach and raise the emergency fund
          we aim for.
        </p>

        <div className="mt-10 grid max-w-lg gap-3 sm:grid-cols-2">
          {steadyOptions.map((option) => {
            const isChosen = household.incomeVaries === option.value;

            let optionClasses = 'rounded-2xl border p-5 text-left transition-all duration-300 ease-smooth ';
            if (isChosen === true) {
              optionClasses = optionClasses + 'border-ink bg-ink text-paper';
            } else {
              optionClasses = optionClasses + 'border-line bg-surface text-ink hover:border-ink';
            }

            let noteClasses = 'mt-2 block text-[13px] ';
            if (isChosen === true) {
              noteClasses = noteClasses + 'text-paper/60';
            } else {
              noteClasses = noteClasses + 'text-muted';
            }

            // React keys have to be text, and true or false is not.
            return (
              <button
                key={String(option.value)}
                type="button"
                onClick={() => handleIncomeVariesChange(option.value)}
                aria-pressed={isChosen}
                className={optionClasses}
              >
                <span className="block text-[15.5px] font-semibold">{option.label}</span>
                <span className={noteClasses}>{option.note}</span>
              </button>
            );
          })}
        </div>

        <p className="mt-5 text-[13px] text-muted">
          Pick &ldquo;it moves around&rdquo; if a bad month is more than about a fifth off a good one.
        </p>
      </div>
    );
  }

  if (currentStep === 'loan') {
    const loanOptions = [
      { value: true, label: 'Yes, still paying', note: 'We will prioritise clearing it' },
      { value: false, label: 'No loan', note: 'More room to invest early' },
    ];

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

        <div className="mt-10 grid max-w-lg gap-3 sm:grid-cols-2">
          {loanOptions.map((option) => {
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

            // React keys have to be text, and true or false is not.
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
            Step {stepIndex + 1} of {steps.length}
          </span>
        </div>

        <div className="mt-4 flex gap-2">
          {steps.map((stepName, index) => {
            const isDone = index <= stepIndex;

            let segmentClasses = 'h-1 flex-1 rounded-full transition-colors duration-500 ';
            if (isDone === true) {
              segmentClasses = segmentClasses + 'bg-accent';
            } else {
              segmentClasses = segmentClasses + 'bg-line';
            }

            return <span key={stepName} className={segmentClasses} />;
          })}
        </div>

        {/* ---------- The question, and the live preview ---------- */}
        <div className="mt-16 grid gap-12 lg:grid-cols-[1fr_0.8fr] lg:gap-20">

          <div>
            {question}

            {formError ? (
              <p className="mt-8 rounded-xl border border-clay/25 bg-claySoft px-4 py-3 text-[13.5px] text-clay">
                {formError}
              </p>
            ) : null}

            <div className="mt-12 flex items-center gap-3">
              {stepIndex > 0 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="rounded-full border border-line bg-surface px-6 py-3.5 text-[14.5px] font-semibold text-ink transition-all duration-300 ease-smooth hover:border-ink"
                >
                  Back
                </button>
              ) : null}

              <Button onClick={handleNext} variant="accent" arrow disabled={isSaving}>
                {nextLabel}
              </Button>
            </div>
          </div>

          {/* The preview. Hidden on small screens, where it would push the
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
