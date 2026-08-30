import { useState } from 'react';
import Button from '../shared/Button';
import TextField from '../shared/TextField';
import SelectField from '../shared/SelectField';
import { ASSET_KINDS } from '../../lib/networth';

/*
  AssetForm
  ---------
  Adding something you own, and editing it. The same form for both, like
  DebtForm and GoalForm, so all three behave the same way.

  Props:
    asset    - the asset being edited, or nothing when adding
    onSave   - called with the values; should return the api result
    onCancel - close without saving
*/
export default function AssetForm({ asset, onSave, onCancel }) {
  const [name, setName] = useState(asset ? asset.name : '');
  const [kind, setKind] = useState(asset ? asset.kind : 'cash');
  const [value, setValue] = useState(asset ? String(asset.value) : '');

  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSaving(true);

    const result = await onSave({
      name: name,
      kind: kind,
      value: Number(value),
    });

    setIsSaving(false);

    if (!result.ok) {
      setError(result.error);
    }
  };

  let saveLabel = 'Add it';
  if (asset) {
    saveLabel = 'Save changes';
  }
  if (isSaving === true) {
    saveLabel = 'Saving…';
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="rounded-[22px] border border-line bg-surface p-6 shadow-card sm:p-7">

      <div className="grid gap-5 sm:grid-cols-3">
        <TextField
          id="asset-name"
          label="What is it?"
          type="text"
          value={name}
          onChange={setName}
          placeholder="HDFC savings"
        />

        <SelectField
          id="asset-kind"
          label="Kind"
          value={kind}
          onChange={setKind}
          options={ASSET_KINDS}
        />

        <TextField
          id="asset-value"
          label="Worth today"
          type="text"
          value={value}
          onChange={setValue}
          placeholder="112000"
          prefix="₹"
          inputMode="numeric"
        />
      </div>

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
