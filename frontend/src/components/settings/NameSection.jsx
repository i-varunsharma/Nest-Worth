import { useState } from 'react';
import Button from '../shared/Button';
import Card from '../shared/Card';
import TextField from '../shared/TextField';
import * as api from '../../lib/api';

export default function NameSection({ initialName }) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSaved(false);
    setIsSaving(true);

    const result = await api.saveName(name);

    setIsSaving(false);

    if (result.ok === false) {
      setError(result.error);
      return;
    }

    setIsSaved(true);
  };

  let saveLabel = 'Save name';
  if (isSaving === true) {
    saveLabel = 'Saving…';
  }

  return (
    <Card as="form" onSubmit={handleSubmit} noValidate>
      <h2 className="font-display text-[24px] leading-tight tracking-[-0.01em]">What we call you</h2>

      <div className="mt-5 max-w-sm">
        <TextField id="settings-name" label="Your name" type="text" value={name} onChange={setName} error={error} placeholder="Varun Sharma" autoComplete="name" />
      </div>

      {isSaved === true ? <p className="mt-4 text-[13.5px] text-accentDeep">Saved.</p> : null}

      <div className="mt-6">
        <Button type="submit" variant="accent" disabled={isSaving}>
          {saveLabel}
        </Button>
      </div>
    </Card>
  );
}
