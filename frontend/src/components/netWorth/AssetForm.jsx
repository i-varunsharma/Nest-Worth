import { useState } from 'react';
import Card from '../shared/Card';
import FormActions from '../shared/FormActions';
import Notice from '../shared/Notice';
import SelectField from '../shared/SelectField';
import TextField from '../shared/TextField';
import { ASSET_KINDS } from '../../lib/networth';

/*
  Adds something owned, or edits it when "asset" is given.

  Props:
    asset     the asset being edited, or null when adding
    onSave    called with the values; returns the api result
    onCancel  closes the form
*/
export default function AssetForm({ asset, onSave, onCancel }) {
  let start = { name: '', kind: 'cash', value: '' };

  if (asset) {
    start = { name: asset.name, kind: asset.kind, value: String(asset.value) };
  }

  const [name, setName] = useState(start.name);
  const [kind, setKind] = useState(start.kind);
  const [value, setValue] = useState(start.value);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSaving(true);

    const result = await onSave({ name: name, kind: kind, value: Number(value) });

    setIsSaving(false);

    if (result.ok === false) {
      setError(result.error);
    }
  };

  let saveLabel = 'Add it';
  if (asset) {
    saveLabel = 'Save changes';
  }

  return (
    <Card as="form" onSubmit={handleSubmit} noValidate>
      <div className="grid gap-5 sm:grid-cols-3">
        <TextField id="asset-name" label="What is it?" type="text" value={name} onChange={setName} placeholder="HDFC savings" />
        <SelectField id="asset-kind" label="Kind" value={kind} onChange={setKind} options={ASSET_KINDS} />
        <TextField id="asset-value" label="Worth today" type="text" value={value} onChange={setValue} placeholder="112000" prefix="₹" inputMode="numeric" />
      </div>

      <Notice tone="error" className="mt-5">{error}</Notice>

      <FormActions saveLabel={saveLabel} isSaving={isSaving} onCancel={onCancel} />
    </Card>
  );
}
