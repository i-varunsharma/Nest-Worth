import { useState } from 'react';
import Card from '../shared/Card';
import FormActions from '../shared/FormActions';
import Notice from '../shared/Notice';
import TextField from '../shared/TextField';
import { describeGoal } from '../../lib/goals';
import { formatRupees } from '../../lib/plan';

/*
  Adds a savings goal, or edits one when "goal" is given.

  Props:
    goal      the goal being edited, or null when adding
    onSave    called with the values; returns the api result
    onCancel  closes the form
*/

/* A year from today as 'YYYY-MM-DD', the format a date input uses. */
function oneYearFromNow() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

/* The sentence under the form: what the goal needs each month, or null. */
function previewMessage(targetAmount, savedAmount, targetDate) {
  if (!Number.isFinite(targetAmount) || targetAmount <= 0 || !Number.isFinite(savedAmount)) {
    return null;
  }

  const detail = describeGoal({ targetAmount: targetAmount, savedAmount: savedAmount, targetDate: targetDate });

  if (detail.isComplete === true) {
    return <p className="text-[13.5px] text-accentDeep">Already there. Nothing more needed for this one.</p>;
  }

  if (detail.months <= 0) {
    return (
      <p className="text-[13.5px] text-clay">
        That date has passed, so the whole <span className="tnum font-semibold">{formatRupees(detail.remaining)}</span> is
        needed now. Pick a later date if that is not realistic.
      </p>
    );
  }

  return (
    <p className="text-[13.5px] text-ink2">
      That needs <span className="tnum font-semibold text-ink">{formatRupees(detail.monthlyNeeded)}</span> a month
      for <span className="tnum font-semibold text-ink">{detail.months} months</span>.
    </p>
  );
}

export default function GoalForm({ goal, onSave, onCancel }) {
  let start = { name: '', targetAmount: '', savedAmount: '0', targetDate: oneYearFromNow() };

  if (goal) {
    start = {
      name: goal.name,
      targetAmount: String(goal.targetAmount),
      savedAmount: String(goal.savedAmount),
      targetDate: goal.targetDate,
    };
  }

  const [name, setName] = useState(start.name);
  const [targetAmount, setTargetAmount] = useState(start.targetAmount);
  const [savedAmount, setSavedAmount] = useState(start.savedAmount);
  const [targetDate, setTargetDate] = useState(start.targetDate);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSaving(true);

    const result = await onSave({
      name: name,
      targetAmount: Number(targetAmount),
      savedAmount: Number(savedAmount),
      targetDate: targetDate,
    });

    setIsSaving(false);

    if (result.ok === false) {
      setError(result.error);
    }
  };

  const preview = previewMessage(Number(targetAmount), Number(savedAmount), targetDate);

  let saveLabel = 'Add goal';
  if (goal) {
    saveLabel = 'Save changes';
  }

  return (
    <Card as="form" onSubmit={handleSubmit} noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField id="goal-name" label="What are you saving for?" type="text" value={name} onChange={setName} placeholder="Emergency fund" />

        {/* The browser's own date picker already handles keyboards and screen readers. */}
        <div>
          <label htmlFor="goal-date" className="mb-2 block text-[13px] font-medium text-ink2">By when?</label>
          <input
            id="goal-date"
            type="date"
            value={targetDate}
            onChange={(event) => setTargetDate(event.target.value)}
            className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-[15px] text-ink outline-none transition-colors duration-300 focus:border-accent"
          />
        </div>

        <TextField id="goal-target" label="How much in total?" type="text" value={targetAmount} onChange={setTargetAmount} placeholder="300000" prefix="₹" inputMode="numeric" />
        <TextField id="goal-saved" label="Saved so far" type="text" value={savedAmount} onChange={setSavedAmount} placeholder="0" prefix="₹" inputMode="numeric" />
      </div>

      {preview ? <div className="mt-6 rounded-xl border border-line bg-paperDeep px-4 py-3.5">{preview}</div> : null}

      <Notice tone="error" className="mt-5">{error}</Notice>

      <FormActions saveLabel={saveLabel} isSaving={isSaving} onCancel={onCancel} />
    </Card>
  );
}
