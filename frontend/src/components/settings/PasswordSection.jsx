import { useState } from 'react';
import Button from '../shared/Button';
import Card from '../shared/Card';
import TextField from '../shared/TextField';
import * as api from '../../lib/api';
import { checkPassword } from '../../lib/validation';

/*
  Changing the password, or setting a first one for an account that signed up
  with Google or a phone code. Saving signs out every other browser.
*/
export default function PasswordSection({ hasPassword }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaved(false);

    // Checked here first, so an obviously short password never leaves the page.
    const newPasswordError = checkPassword(newPassword, true);
    if (newPasswordError) {
      setErrors({ newPassword: newPasswordError });
      return;
    }

    setErrors({});
    setIsSaving(true);

    const result = await api.changePassword(currentPassword, newPassword);

    setIsSaving(false);

    if (result.ok === false) {
      // The server names the field when it knows which one was wrong.
      const found = {};
      if (result.field) {
        found[result.field] = result.error;
      } else {
        found.newPassword = result.error;
      }
      setErrors(found);
      return;
    }

    // A password should not stay sitting in a form on screen.
    setCurrentPassword('');
    setNewPassword('');
    setIsSaved(true);
  };

  let heading = 'Set a password';
  let blurb = 'You sign in with Google or a phone code. Adding a password gives you a second way in.';
  let buttonLabel = 'Set password';

  if (hasPassword === true) {
    heading = 'Change your password';
    blurb = 'Choose something you have not used anywhere else.';
    buttonLabel = 'Change password';
  }

  if (isSaving === true) {
    buttonLabel = 'Saving…';
  }

  return (
    <Card as="form" onSubmit={handleSubmit} noValidate>
      <h2 className="font-display text-[24px] leading-tight tracking-[-0.01em]">{heading}</h2>
      <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink2">{blurb}</p>

      <div className="mt-6 max-w-sm space-y-5">
        {hasPassword === true ? (
          <TextField
            id="current-password"
            label="Current password"
            type="password"
            value={currentPassword}
            onChange={setCurrentPassword}
            error={errors.currentPassword}
            placeholder="The one you use now"
            autoComplete="current-password"
          />
        ) : null}

        <TextField
          id="new-password"
          label="New password"
          type="password"
          value={newPassword}
          onChange={setNewPassword}
          error={errors.newPassword}
          placeholder="At least 8 characters"
          autoComplete="new-password"
        />
      </div>

      {isSaved === true ? <p className="mt-4 text-[13.5px] text-accentDeep">Saved. Every other browser has been signed out.</p> : null}

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Button type="submit" variant="accent" disabled={isSaving}>
          {buttonLabel}
        </Button>
        <p className="text-2xs leading-relaxed text-muted">Changing this signs you out everywhere else, but not here.</p>
      </div>
    </Card>
  );
}
