import { useState } from 'react';

/*
  The editing state for a page that lists records: which form is open, and what
  happens when it is saved or a record is deleted.

    const editor = useRecordEditor({
      add: api.addDebt,
      update: api.updateDebt,
      remove: api.deleteDebt,
      onChanged: page.reload,
    });

  editor.isOpen          a form is showing
  editor.record          the record being edited, or null when adding
  editor.formKey         pass as the form's key, see below
  editor.startAdding()   open an empty form
  editor.startEditing(r) open the form for record r
  editor.close()         close without saving
  editor.save(values)    add or update; returns the api result for the form to show errors
  editor.remove(id)      delete, then reload

  The form key matters: a form's useState reads its starting values only when it
  first appears. Without a key that changes per record, pressing Edit on a second
  record would keep the first record's values in the boxes.
*/
export default function useRecordEditor(options) {
  // null when closed, 'new' when adding, or the record being edited.
  const [target, setTarget] = useState(null);

  const isOpen = target !== null;
  const isAdding = target === 'new';

  let record = null;
  let formKey = 'new';

  if (isOpen === true && isAdding === false) {
    record = target;
    formKey = 'record-' + target.id;
  }

  async function save(values) {
    let result;

    if (isAdding === true) {
      result = await options.add(values);
    } else {
      result = await options.update(target.id, values);
    }

    if (result.ok === true) {
      setTarget(null);
      options.onChanged();
    }

    return result;
  }

  async function remove(id) {
    await options.remove(id);
    options.onChanged();
  }

  return {
    isOpen: isOpen,
    record: record,
    formKey: formKey,
    startAdding: () => {
      setTarget('new');
    },
    startEditing: (recordToEdit) => {
      setTarget(recordToEdit);
    },
    close: () => {
      setTarget(null);
    },
    save: save,
    remove: remove,
  };
}
