import { useState } from 'react';

/*
  The Edit and Delete links on a debt, goal, asset or family member.

  Deleting asks for confirmation first, in place, so a stray click cannot lose a
  record. deleteLabel changes the wording, for example "Remove" for a person.
*/
export default function RecordActions({ onEdit, onDelete, deleteLabel }) {
  const [isConfirming, setIsConfirming] = useState(false);

  let label = 'Delete';
  if (deleteLabel) {
    label = deleteLabel;
  }

  const linkClasses = 'sweep text-[13px] font-medium text-muted transition-colors';

  if (isConfirming === true) {
    return (
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onDelete}
          className="text-[13px] font-semibold text-clay transition-colors hover:underline"
        >
          Really {label.toLowerCase()}
        </button>
        <button
          type="button"
          onClick={() => setIsConfirming(false)}
          className={linkClasses + ' hover:text-ink'}
        >
          Keep
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={onEdit} className={linkClasses + ' hover:text-ink'}>
        Edit
      </button>
      <button type="button" onClick={() => setIsConfirming(true)} className={linkClasses + ' hover:text-clay'}>
        {label}
      </button>
    </div>
  );
}
