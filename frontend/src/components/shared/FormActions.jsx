import Button from './Button';

/*
  The Save and Cancel buttons at the bottom of a record form.

    <FormActions saveLabel="Add debt" isSaving={isSaving} onCancel={onCancel} />

  The save button is a submit button, so pressing Enter in any field saves too.
*/
export default function FormActions({ saveLabel, isSaving, onCancel }) {
  let label = saveLabel;
  if (isSaving === true) {
    label = 'Saving…';
  }

  return (
    <div className="mt-7 flex items-center gap-3">
      <Button type="submit" variant="accent" disabled={isSaving}>
        {label}
      </Button>

      <Button variant="secondary" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}
