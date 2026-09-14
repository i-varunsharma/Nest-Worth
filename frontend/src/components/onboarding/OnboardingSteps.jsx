import AmountSlider from './AmountSlider';
import ChoiceCards from './ChoiceCards';
import Question from './Question';
import TextField from '../shared/TextField';
import { formatRupees } from '../../lib/plan';

/*
  The onboarding questions, one component each. Each receives the household
  answers so far and a function to change them.
*/

export const LOWEST_INCOME = 20000;
export const HIGHEST_INCOME = 250000;

// Living costs can be set up to this share of income. The server refuses costs
// at or above the whole income, so the slider never needs to reach it.
export const HIGHEST_COSTS_SHARE = 0.7;

const DEPENDENT_CHOICES = [0, 1, 2, 3];


export function NameStep({ name, error, onChange }) {
  return (
    <Question title="First, what should we call you?" intro="You signed in with your number, so we do not have a name yet.">
      <div className="max-w-sm">
        <TextField id="name" label="Your name" type="text" value={name} onChange={onChange} error={error} placeholder="Varun Sharma" autoComplete="name" />
      </div>
    </Question>
  );
}


export function IncomeStep({ household, onChange }) {
  // Lowering the income also lowers the costs, if they would now be above the cap.
  const handleChange = (income) => {
    const highestCosts = Math.round(income * HIGHEST_COSTS_SHARE);
    const essentialCosts = Math.min(household.essentialCosts, highestCosts);

    onChange({ income: income, essentialCosts: essentialCosts });
  };

  return (
    <Question
      title="What lands in your account each month?"
      intro="Take-home pay, after tax and deductions, not your CTC. A rough figure is fine. You can change it whenever it changes."
    >
      <AmountSlider
        id="income"
        label="Monthly take-home"
        value={household.income}
        min={LOWEST_INCOME}
        max={HIGHEST_INCOME}
        step={1000}
        lowLabel="₹20k"
        highLabel="₹2.5L"
        onChange={handleChange}
      />
    </Question>
  );
}


export function CostsStep({ household, onChange }) {
  const highestCosts = Math.round(household.income * HIGHEST_COSTS_SHARE);
  const leftOver = household.income - household.essentialCosts;

  return (
    <Question
      title="What has to be paid every month?"
      intro="Rent, food, transport, bills and anything else that arrives whether you want it to or not. A rough figure is fine."
      footnote="Guessing high is safer than guessing low. A plan you can keep beats one that looks impressive for a fortnight."
    >
      <AmountSlider
        id="costs"
        label="Rent, food and bills"
        value={household.essentialCosts}
        min={0}
        max={highestCosts}
        step={500}
        lowLabel="Nothing fixed"
        highLabel={formatRupees(highestCosts)}
        onChange={(essentialCosts) => onChange({ essentialCosts: essentialCosts })}
      />

      <p className="mt-6 max-w-lg rounded-xl border border-line bg-paperDeep px-4 py-3.5 text-[13.5px] text-ink2">
        That leaves <span className="tnum font-semibold text-ink">{formatRupees(leftOver)}</span> before your
        household support and any loan.
      </p>
    </Question>
  );
}


export function IncomeVariesStep({ household, onChange }) {
  const options = [
    { value: false, label: 'About the same', note: 'A salary that arrives on a date' },
    { value: true, label: 'It moves around', note: 'Freelance, commission, or a business' },
  ];

  return (
    <Question
      title="Is that roughly the same every month?"
      intro="If your income moves around, a thin month is normal rather than an emergency, so we hold more of your money as cash and aim for a bigger emergency fund."
      footnote="Pick “it moves around” if a bad month is more than about a fifth off a good one."
    >
      <ChoiceCards options={options} value={household.incomeVaries} onChange={(incomeVaries) => onChange({ incomeVaries: incomeVaries })} />
    </Question>
  );
}


export function DependentsStep({ household, onChange }) {
  return (
    <Question
      title="How many people does it have to cover?"
      intro="Parents you send money to, a sibling still studying, anyone whose costs come out of your salary before you spend on yourself. You can name them on the Family page later."
      footnote="Not sure? Count the people who would struggle if your salary stopped."
    >
      <div className="flex flex-wrap gap-3">
        {DEPENDENT_CHOICES.map((count) => {
          const isChosen = household.dependents === count;

          let optionClasses = 'flex h-16 w-16 items-center justify-center rounded-2xl border text-[20px] font-semibold transition-all duration-300 ease-smooth ';
          if (isChosen === true) {
            optionClasses = optionClasses + 'border-ink bg-ink text-paper';
          } else {
            optionClasses = optionClasses + 'border-line bg-surface text-muted hover:border-ink hover:text-ink';
          }

          return (
            <button key={count} type="button" onClick={() => onChange({ dependents: count })} aria-pressed={isChosen} className={optionClasses}>
              {count}
            </button>
          );
        })}
      </div>
    </Question>
  );
}


export function LoanStep({ household, onChange }) {
  const options = [
    { value: true, label: 'Yes, still paying', note: 'We will prioritise clearing it' },
    { value: false, label: 'No loan', note: 'More room to invest early' },
  ];

  return (
    <Question
      title="Is an education loan still running?"
      intro="Education loans in India usually charge around 11%. That is more than the market reliably pays, so if one is running we clear it before putting money into investments."
    >
      <ChoiceCards options={options} value={household.hasLoan} onChange={(hasLoan) => onChange({ hasLoan: hasLoan })} />
    </Question>
  );
}
