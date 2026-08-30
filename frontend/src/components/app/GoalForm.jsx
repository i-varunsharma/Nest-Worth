import { useState } from 'react';
import Button from '../shared/Button';
import TextField from '../shared/TextField';
import { describeGoal } from '../../lib/goals';
import { formatRupees } from '../../lib/plan';

/*
  GoalForm
  --------
  Adding a savings goal, and editing one. One form for both: when "goal" is
  given it starts filled in, otherwise it starts blank.

  Props:
    goal     - the goal being edited, or nothing when adding
    onSave   - called with the values; should return the api result
    onCancel - close without saving
*/

/*
  A date one year from today, as 'YYYY-MM-DD'.

  toISOString always gives UTC, and slicing the first ten characters is the
  usual way to get just the date part in the form a date input expects.
*/
function oneYearFromNow() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

export default function GoalForm({ goal, onSave, onCancel }) {
  const [name, setName] = useState(goal ? goal.name : '');
  const [targetAmount, setTargetAmount] = useState(goal ? String(goal.targetAmount) : '');
  const [savedAmount, setSavedAmount] = useState(goal ? String(goal.savedAmount) : '0');
  const [targetDate, setTargetDate] = useState(goal ? goal.targetDate : oneYearFromNow());

  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const targetNumber = Number(targetAmount);
  const savedNumber = Number(savedAmount);

  // The live preview: what this goal would need every month.
  let preview = null;

  if (Number.isFinite(targetNumber) && targetNumber > 0 && Number.isFinite(savedNumber)) {
    preview = describeGoal({
      targetAmount: targetNumber,
      savedAmount: savedNumber,
      targetDate: targetDate,
    });
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSaving(true);

    const result = await onSave({
      name: name,
      targetAmount: targetNumber,
      savedAmount: savedNumber,
      targetDate: targetDate,
    });

    setIsSaving(false);

    if (!result.ok) {
      setError(result.error);
    }
  };

  let saveLabel = 'Add goal';
  if (goal) {
    saveLabel = 'Save changes';
  }
  if (isSaving === true) {
    saveLabel = 'Saving…';
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="rounded-[22px] border border-line bg-surface p-6 shadow-card sm:p-7">

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="goal-name"
          label="What are you saving for?"
          type="text"
          value={name}
          onChange={setName}
          placeholder="Emergency fund"
        />

        {/*
          A plain date input. The browser draws its own calendar, which is
          better than anything worth hand-building here: it already knows about
          leap years, and it already works with a keyboard and a screen reader.
        */}
        <div>
          <label htmlFor="goal-date" className="mb-2 block text-[13px] font-medium text-ink2">
            By when?
          </label>
          <input
            id="goal-date"
            type="date"
            value={targetDate}
            onChange={(event) => setTargetDate(event.target.value)}
            className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-[15px] text-ink outline-none transition-colors duration-300 focus:border-accent"
          />
        </div>

        <TextField
          id="goal-target"
          label="How much in total?"
          type="text"
          value={targetAmount}
          onChange={setTargetAmount}
          placeholder="300000"
          prefix="₹"
          inputMode="numeric"
        />

        <TextField
          id="goal-saved"
          label="Saved so far"
          type="text"
          value={savedAmount}
          onChange={setSavedAmount}
          placeholder="0"
          prefix="₹"
          inputMode="numeric"
        />
      </div>

      {preview ? (
        <div className="mt-6 rounded-xl border border-line bg-paperDeep px-4 py-3.5">
          {preview.isComplete === true ? (
            <p className="text-[13.5px] text-accentDeep">
              Already there. Nothing more needed for this one.
            </p>
          ) : preview.months <= 0 ? (
            <p className="text-[13.5px] text-clay">
              That date has passed, so the whole{' '}
              <span className="tnum font-semibold">{formatRupees(preview.remaining)}</span> is
              needed now. Pick a later date if that is not realistic.
            </p>
          ) : (
            <p className="text-[13.5px] text-ink2">
              That needs{' '}
              <span className="tnum font-semibold text-ink">
                {formatRupees(preview.monthlyNeeded)}
              </span>{' '}
              a month for{' '}
              <span className="tnum font-semibold text-ink">{preview.months} months</span>.
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
