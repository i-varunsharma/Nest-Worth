import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../shared/Button';
import TextField from '../shared/TextField';
import * as api from '../../lib/api';

/*
  Deleting the account and everything in it. Folded shut until asked for, and it
  needs the password, or the word DELETE for an account that has no password.
*/
export default function CloseAccountSection({ hasPassword }) {
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsDeleting(true);

    const result = await api.deleteAccount(password, confirmText);

    setIsDeleting(false);

    if (result.ok === false) {
      setError(result.error);
      return;
    }

    navigate('/');
  };

  let deleteLabel = 'Delete my account';
  if (isDeleting === true) {
    deleteLabel = 'Deleting…';
  }

  return (
    <div className="rounded-[22px] border border-clay/25 bg-claySoft/40 p-6 sm:p-7">
      <h2 className="font-display text-[24px] leading-tight tracking-[-0.01em] text-clay">Close your account</h2>

      <p className="mt-2.5 max-w-lg text-[14.5px] leading-relaxed text-ink2">
        This removes your account and everything stored against it: your household, your family list, your debts,
        your goals, what you own, your statements and every monthly check-in. It cannot be undone, and we keep no copy.
      </p>

      {isOpen === false ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="mt-6 rounded-full border border-clay/40 px-6 py-3.5 text-[14.5px] font-semibold text-clay transition-all duration-300 ease-smooth hover:border-clay hover:bg-claySoft"
        >
          Delete my account
        </button>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="mt-6 max-w-sm">
          {hasPassword === true ? (
            <TextField id="close-password" label="Your password" type="password" value={password} onChange={setPassword} placeholder="To confirm it is you" autoComplete="current-password" />
          ) : (
            <TextField id="close-confirm" label="Type DELETE to confirm" type="text" value={confirmText} onChange={setConfirmText} placeholder="DELETE" />
          )}

          {error ? <p role="alert" className="mt-4 text-[13.5px] text-clay">{error}</p> : null}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isDeleting}
              className="rounded-full bg-clay px-6 py-3.5 text-[14.5px] font-semibold text-paper transition-all duration-300 ease-smooth hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleteLabel}
            </button>

            <Button variant="secondary" onClick={() => setIsOpen(false)}>
              Keep my account
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
