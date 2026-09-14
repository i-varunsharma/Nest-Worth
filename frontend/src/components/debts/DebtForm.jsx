import { useState } from 'react';
import Card from '../shared/Card';
import FormActions from '../shared/FormActions';
import Notice from '../shared/Notice';
import SelectField from '../shared/SelectField';
import TextField from '../shared/TextField';
import { DEBT_KINDS } from '../../lib/networth';
import { payoff } from '../../lib/debt';
import { formatRupees } from '../../lib/plan';

/*
  Adds a debt, or edits one when "debt" is given.

  Props:
    debt      the debt being edited, or null when adding
    onSave    called with the values; returns the api result
    onCancel  closes the form
*/

function isPositiveNumber(value) {
  return Number.isFinite(value) && value > 0;
}

/* The sentence under the form once the three figures make sense, or null. */
function previewMessage(principal, annualRate, emi) {
  if (!isPositiveNumber(principal) || !isPositiveNumber(emi) || !Number.isFinite(annualRate) || annualRate < 0) {
    return null;
  }

  const result = payoff(principal, annualRate, emi, 0);

  if (result.clears === true) {
    return (
      <p className="text-[13.5px] text-ink2">
        At that EMI this clears in <span className="tnum font-semibold text-ink">{result.months} months</span>,
        costing <span className="tnum font-semibold text-ink">{formatRupees(result.totalInterest)}</span> in interest.
      </p>
    );
  }

  if (result.reason === 'interest') {
    return (
      <p className="text-[13.5px] text-clay">
        That EMI is smaller than the interest, so the balance would grow. It needs to be at least{' '}
        <span className="tnum font-semibold">{formatRupees(emi + result.shortfall)}</span> a month.
      </p>
    );
  }

  return (
    <p className="text-[13.5px] text-clay">
      That EMI only just covers the interest, so this would take more than fifty years and still leave{' '}
      <span className="tnum font-semibold">{formatRupees(result.remainingAfterCap)}</span> owing. Raising it
      even a little makes a large difference.
    </p>
  );
}

export default function DebtForm({ debt, onSave, onCancel }) {
  let start = { name: '', kind: 'education', principal: '', annualRate: '11', emi: '' };

  if (debt) {
    start = {
      name: debt.name,
      kind: debt.kind,
      principal: String(debt.principal),
      annualRate: String(debt.annualRate),
      emi: String(debt.emi),
    };
  }

  const [name, setName] = useState(start.name);
  const [kind, setKind] = useState(start.kind);
  const [principal, setPrincipal] = useState(start.principal);
  const [annualRate, setAnnualRate] = useState(start.annualRate);
  const [emi, setEmi] = useState(start.emi);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Picking a kind while adding fills in a typical rate. Never while editing,
  // so a real rate somebody typed is not overwritten.
  const handleKindChange = (newKind) => {
    setKind(newKind);

    if (debt) {
      return;
    }

    for (const option of DEBT_KINDS) {
      if (option.value === newKind) {
        setAnnualRate(String(option.typicalRate));
      }
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSaving(true);

    const result = await onSave({
      name: name,
      kind: kind,
      principal: Number(principal),
      annualRate: Number(annualRate),
      emi: Number(emi),
    });

    setIsSaving(false);

    // The server applies the real rules, so its message is the one to show.
    if (result.ok === false) {
      setError(result.error);
    }
  };

  const preview = previewMessage(Number(principal), Number(annualRate), Number(emi));

  let saveLabel = 'Add debt';
  if (debt) {
    saveLabel = 'Save changes';
  }

  return (
    <Card as="form" onSubmit={handleSubmit} noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField id="debt-name" label="What is it?" type="text" value={name} onChange={setName} placeholder="Education loan" />
        <SelectField id="debt-kind" label="Kind" value={kind} onChange={handleKindChange} options={DEBT_KINDS} />
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
        <TextField id="debt-emi" label="Monthly EMI" type="text" value={emi} onChange={setEmi} placeholder="9500" prefix="₹" inputMode="numeric" />
      </div>

      {preview ? <div className="mt-6 rounded-xl border border-line bg-paperDeep px-4 py-3.5">{preview}</div> : null}

      <Notice tone="error" className="mt-5">{error}</Notice>

      <FormActions saveLabel={saveLabel} isSaving={isSaving} onCancel={onCancel} />
    </Card>
  );
}
