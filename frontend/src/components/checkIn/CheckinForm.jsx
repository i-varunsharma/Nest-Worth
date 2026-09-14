import { useState } from 'react';
import Button from '../shared/Button';
import Card from '../shared/Card';
import Notice from '../shared/Notice';
import TextField from '../shared/TextField';
import * as api from '../../lib/api';
import { currentMonth } from '../../lib/checkins';
import { bucketAmount, formatRupees } from '../../lib/plan';

/*
  Records what happened in a month, next to what the plan said.

  Props:
    plan       the plan to compare with, or null before onboarding
    prefill    values from the address, such as { month, income, spent } sent by
               the spending page. They only fill the boxes; nothing is saved
               until the button is pressed.
    onSaved    called after a successful save
*/
export default function CheckinForm({ plan, prefill, onSaved }) {
  // The planned income is a sensible default, unless the spending page sent a real one.
  let startingIncome = prefill.income;
  if (startingIncome === '' && plan !== null) {
    startingIncome = String(plan.income);
  }

  let startingMonth = prefill.month;
  if (startingMonth === '') {
    startingMonth = currentMonth();
  }

  const [month, setMonth] = useState(startingMonth);
  const [income, setIncome] = useState(startingIncome);
  const [spent, setSpent] = useState(prefill.spent);
  const [saved, setSaved] = useState('');
  const [invested, setInvested] = useState(prefill.invested);
  const [note, setNote] = useState('');

  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const plannedSpend = bucketAmount(plan, 'spend');
  const plannedSave = bucketAmount(plan, 'save');
  const plannedInvest = bucketAmount(plan, 'invest');

  function planHint(amount) {
    if (plan === null) {
      return '';
    }
    return 'Plan said ' + formatRupees(amount);
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setJustSaved(false);
    setIsSaving(true);

    const result = await api.saveCheckin({
      month: month,
      income: Number(income),
      spent: Number(spent),
      saved: Number(saved),
      invested: Number(invested),
      note: note,
    });

    setIsSaving(false);

    if (result.ok === false) {
      setError(result.error);
      return;
    }

    setJustSaved(true);
    setNote('');
    onSaved();
  };

  let saveLabel = 'Save this month';
  if (isSaving === true) {
    saveLabel = 'Saving…';
  }

  let successMessage = '';
  if (justSaved === true) {
    successMessage = 'Saved. Recording the same month again just updates it.';
  }

  return (
    <Card as="form" onSubmit={handleSubmit} noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="month" className="mb-2 block text-[13px] font-medium text-ink2">Which month?</label>
          <input
            id="month"
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-[15px] text-ink outline-none transition-colors duration-300 focus:border-accent"
          />
        </div>

        <TextField id="ci-income" label="Income that arrived" type="text" value={income} onChange={setIncome} placeholder="62000" prefix="₹" inputMode="numeric" />
        <TextField id="ci-spent" label="Spent" type="text" value={spent} onChange={setSpent} placeholder={String(plannedSpend)} prefix="₹" inputMode="numeric" hint={planHint(plannedSpend)} />
        <TextField id="ci-saved" label="Saved" type="text" value={saved} onChange={setSaved} placeholder={String(plannedSave)} prefix="₹" inputMode="numeric" hint={planHint(plannedSave)} />
        <TextField id="ci-invested" label="Invested" type="text" value={invested} onChange={setInvested} placeholder={String(plannedInvest)} prefix="₹" inputMode="numeric" hint={planHint(plannedInvest)} />
        <TextField id="ci-note" label="Anything worth remembering?" type="text" value={note} onChange={setNote} placeholder="Sister's fees were due" />
      </div>

      <Notice tone="error" className="mt-5">{error}</Notice>
      <Notice tone="success" className="mt-5">{successMessage}</Notice>

      <div className="mt-7">
        <Button type="submit" variant="accent" disabled={isSaving}>
          {saveLabel}
        </Button>
      </div>
    </Card>
  );
}
