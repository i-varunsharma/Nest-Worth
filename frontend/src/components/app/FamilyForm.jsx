import { useState } from 'react';
import Button from '../shared/Button';
import TextField from '../shared/TextField';
import SelectField from '../shared/SelectField';
import { RELATIONS, checkFamilyMember } from '../../lib/family';

/*
  The form for adding a person, and for editing one. When "member" is given it
  starts filled in and saves changes; otherwise it starts blank.

  Props:
    member   - the person being edited, or nothing when adding
    onSave   - called with the values; should return the api result
    onCancel - close without saving
*/

// A select can only hold text, so yes and no are stored as words here and
// turned into a real true or false when saving.
const COVER_OPTIONS = [
  { value: 'no', label: 'No health cover' },
  { value: 'yes', label: 'Has health cover' },
];

export default function FamilyForm({ member, onSave, onCancel }) {
  let startName = '';
  let startRelation = 'parent';
  let startSupport = '';
  let startCover = 'no';

  if (member) {
    startName = member.name;
    startRelation = member.relation;
    startSupport = String(member.monthlySupport);

    if (member.hasHealthCover === true) {
      startCover = 'yes';
    }
  }

  const [name, setName] = useState(startName);
  const [relation, setRelation] = useState(startRelation);
  const [monthlySupport, setMonthlySupport] = useState(startSupport);
  const [cover, setCover] = useState(startCover);

  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    // An empty box means nothing is sent each month, which is a real answer
    // for a child or a parent who lives with you.
    let supportNumber = 0;
    if (monthlySupport.trim() !== '') {
      supportNumber = Number(monthlySupport);
    }

    const values = {
      name: name,
      relation: relation,
      monthlySupport: supportNumber,
      hasHealthCover: cover === 'yes',
    };

    // The same check the server runs, so a mistake shows before the network.
    const problem = checkFamilyMember(values);

    if (problem !== '') {
      setError(problem);
      return;
    }

    setIsSaving(true);
    const result = await onSave(values);
    setIsSaving(false);

    if (result.ok === false) {
      setError(result.error);
    }
  };

  let saveLabel = 'Add person';
  if (member) {
    saveLabel = 'Save changes';
  }
  if (isSaving === true) {
    saveLabel = 'Saving…';
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="rounded-[22px] border border-line bg-surface p-6 shadow-card sm:p-7">
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="family-name"
          label="Name"
          type="text"
          value={name}
          onChange={setName}
          placeholder="Papa"
          maxLength={40}
        />

        <SelectField
          id="family-relation"
          label="Relation"
          value={relation}
          onChange={setRelation}
          options={RELATIONS}
        />

        <TextField
          id="family-support"
          label="Support each month"
          type="text"
          value={monthlySupport}
          onChange={setMonthlySupport}
          placeholder="8000"
          prefix="₹"
          inputMode="numeric"
          hint="Money sent, or spent on them. Leave empty if nothing moves."
        />

        <SelectField
          id="family-cover"
          label="Health insurance"
          value={cover}
          onChange={setCover}
          options={COVER_OPTIONS}
          hint="Used by the hospital bill in the stress test."
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
