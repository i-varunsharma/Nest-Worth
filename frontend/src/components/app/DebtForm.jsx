import { useState } from 'react';
import Button from '../shared/Button';
import TextField from '../shared/TextField';
import SelectField from '../shared/SelectField';
import { DEBT_KINDS } from '../../lib/networth';
import { payoff } from '../../lib/debt';
import { formatRupees } from '../../lib/plan';

/*
  DebtForm
  --------
  The form for adding a debt, and for editing one. It is the same form either
  way: when "debt" is given it starts filled in and saves changes, and when it
  is not it starts blank and adds a new one.

  Writing one form for both is worth the small amount of extra thought. Two
  nearly-identical forms drift apart, and then adding a field means remembering
  to add it twice.

  Props:
    debt     - the debt being edited, or nothing when adding
    onSave   - called with the values; should return the api result
    onCancel - close without saving
*/

export default function DebtForm({ debt, onSave, onCancel }) {
  // Start from the debt being edited, or sensible blanks.
  const [name, setName] = useState(debt ? debt.name : '');
  const [kind, setKind] = useState(debt ? debt.kind : 'education');
  const [principal, setPrincipal] = useState(debt ? String(debt.principal) : '');
  const [annualRate, setAnnualRate] = useState(debt ? String(debt.annualRate) : '11');
  const [emi, setEmi] = useState(debt ? String(debt.emi) : '');

  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  /*
    A live preview under the form.

    Numbers typed into a form arrive as text, so they are converted here. An
    empty box becomes NaN, and payoff() would then return nonsense, so we only
    work it out once all three figures are real numbers.
  */
  const principalNumber = Number(principal);
  const rateNumber = Number(annualRate);
  const emiNumber = Number(emi);

  let preview = null;

  const haveAllThree =
    Number.isFinite(principalNumber) && principalNumber > 0
    && Number.isFinite(rateNumber) && rateNumber >= 0
    && Number.isFinite(emiNumber) && emiNumber > 0;

  if (haveAllThree === true) {
    preview = payoff(principalNumber, rateNumber, emiNumber, 0);
  }

  /*
    When somebody picks a kind of debt, fill in a typical interest rate for it.
    It saves looking it up, and anybody who knows their real rate can type over
    it. We only do this while adding, never while editing, because overwriting
    somebody's real figure would be rude.
  */
  const handleKindChange = (newKind) => {
    setKind(newKind);

    if (debt) {
      return;
    }

    const match = DEBT_KINDS.find((item) => item.value === newKind);

    if (match) {
      setAnnualRate(String(match.typicalRate));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSaving(true);

    const result = await onSave({
      name: name,
      kind: kind,
      principal: principalNumber,
      annualRate: rateNumber,
      emi: emiNumber,
    });

    setIsSaving(false);

    // The server does the real checking, including the rule that an EMI has to
    // be bigger than the monthly interest. Its message is the one to show.
    if (!result.ok) {
      setError(result.error);
    }
  };

  let saveLabel = 'Add debt';
  if (debt) {
    saveLabel = 'Save changes';
  }
  if (isSaving === true) {
    saveLabel = 'Saving…';
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="rounded-[22px] border border-line bg-surface p-6 shadow-card sm:p-7">

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="debt-name"
          label="What is it?"
          type="text"
          value={name}
          onChange={setName}
          placeholder="Education loan"
        />

        <SelectField
          id="debt-kind"
          label="Kind"
          value={kind}
          onChange={handleKindChange}
          options={DEBT_KINDS}
        />

        <TextField
          id="debt-principal"
          label="Still owed"
          type="text"
          value={principal}
          onChange={setPrincipal}
          placeholder="420000"
          prefix="₹"
          inputMode="numeric"
          hint="What is left today, not what you borrowed."
        />

        <TextField
          id="debt-rate"
          label="Interest rate"
          type="text"
          value={annualRate}
          onChange={setAnnualRate}
          placeholder="11.2"
          inputMode="decimal"
          hint="Per year. Check your loan statement."
        />

        <TextField
          id="debt-emi"
          label="Monthly EMI"
          type="text"
          value={emi}
          onChange={setEmi}
          placeholder="9500"
          prefix="₹"
          inputMode="numeric"
        />
      </div>

      {/* The live preview. It appears as soon as the three numbers make sense. */}
      {preview ? (
        <div className="mt-6 rounded-xl border border-line bg-paperDeep px-4 py-3.5">
          {preview.clears === true ? (
            <p className="text-[13.5px] text-ink2">
              At that EMI this clears in{' '}
              <span className="tnum font-semibold text-ink">{preview.months} months</span>, costing{' '}
              <span className="tnum font-semibold text-ink">
                {formatRupees(preview.totalInterest)}
              </span>{' '}
              in interest.
            </p>
          ) : (
            <p className="text-[13.5px] text-clay">
              That EMI is smaller than the interest, so the balance would grow rather than
              shrink. It needs to be at least{' '}
              <span className="tnum font-semibold">
                {formatRupees(emiNumber + preview.shortfall)}
              </span>{' '}
              a month.
            </p>
          )}
        </div>
      ) : null}

      {error ? (
        <p className="mt-5 rounded-xl border border-clay/25 bg-claySoft px-4 py-3 text-[13.5px] text-clay">
          {error}
        </p>
      ) : null}

      <div className="mt-7 flex items-center gap-3">
        <Button type="submit" variant="accent" disabled={isSaving}>
          {saveLabel}
        </Button>

        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-line bg-surface px-6 py-3.5 text-[14.5px] font-semibold text-ink transition-all duration-300 ease-smooth hover:border-ink"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
