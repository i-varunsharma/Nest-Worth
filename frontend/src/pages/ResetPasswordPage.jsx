import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import Button from '../components/shared/Button';
import TextField from '../components/shared/TextField';
import * as api from '../lib/api';
import { checkPassword } from '../lib/validation';

/*
  /reset-password: step two of a password reset. The link in the email carries
  ?token=..., which proves the person can read the account's email. The token is
  only passed to the server, which holds the hash to check it. Success signs in.
*/

export default function ResetPasswordPage() {
  const navigate = useNavigate();

  // useSearchParams reads the ?token=... part of the address.
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Messages that belong under a particular box.
  const [errors, setErrors] = useState({});

  // A message about the whole attempt: an expired link, or an unreachable server.
  const [formError, setFormError] = useState('');

  const [isBusy, setIsBusy] = useState(false);


  const handleSubmit = async (event) => {
    event.preventDefault();

    // Round one: the checks we can do here, all collected at once so the
    // person can fix everything in a single pass.
    const foundErrors = {};

    // "true" means: this is a NEW password, so insist it is long enough.
    // On the login page the same function is called with false, because
    // telling somebody their existing password is too short helps nobody.
    const passwordError = checkPassword(password, true);
    if (passwordError) {
      foundErrors.password = passwordError;
    }

    // Typing the password twice catches a slip that a hidden password box would hide.
    if (!passwordError && confirmPassword !== password) {
      foundErrors.confirmPassword = 'Those two passwords do not match.';
    }

    setErrors(foundErrors);
    setFormError('');

    if (Object.keys(foundErrors).length > 0) {
      return;
    }

    // Round two: the server, which is the only side that can judge the token.
    setIsBusy(true);
    const result = await api.resetPassword(token, password);
    setIsBusy(false);

    if (!result.ok) {
      // A bad token is not the fault of any one box on this form, so that
      // message goes above the whole thing rather than under an input.
      if (result.field === 'password') {
        setErrors({ password: result.error });
      } else {
        setFormError(result.error);
      }
      return;
    }

    // The server signed them in as part of the reset, so there is nowhere to
    // go but straight in.
    navigate('/dashboard');
  };


  // No token means the link was typed by hand or cut short, so there is nothing to submit.
  if (!token) {
    return (
      <AuthLayout
        title="That link is incomplete."
        subtitle="A reset link carries a long code at the end, and this one arrived without it."
        footer={
          <span>
            Remembered it?{' '}
            <Link to="/login" className="sweep font-medium text-ink">Sign in</Link>
          </span>
        }
      >
        <div className="space-y-5">
          <p className="rounded-xl border border-line bg-paperDeep px-5 py-4 text-[13.5px] leading-relaxed text-ink2">
            Mail programs sometimes break long links across two lines. Try
            copying the whole address from the email, or just ask for a new
            link, which takes a moment.
          </p>

          <Button to="/forgot-password" variant="accent" arrow className="w-full">
            Ask for a new link
          </Button>
        </div>
      </AuthLayout>
    );
  }


  let buttonLabel = 'Set new password';
  if (isBusy === true) {
    buttonLabel = 'Saving…';
  }


  return (
    <AuthLayout
      title="Choose a new password."
      subtitle="Pick something you have not used anywhere else, and you will be signed straight in."
      footer={
        <span>
          Remembered it?{' '}
          <Link to="/login" className="sweep font-medium text-ink">Sign in</Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">

        {formError ? (
          <div className="rounded-xl border border-clay/25 bg-claySoft px-4 py-3">
            <p className="text-[13.5px] text-clay">{formError}</p>

            <Link
              to="/forgot-password"
              className="sweep mt-1.5 inline-block text-2xs font-medium text-clay"
            >
              Ask for a new link
            </Link>
          </div>
        ) : null}

        <TextField
          id="password"
          label="New password"
          type="password"
          value={password}
          onChange={setPassword}
          error={errors.password}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          hint="Longer is stronger. A short sentence beats a clever word."
        />

        <TextField
          id="confirmPassword"
          label="New password again"
          type="password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          error={errors.confirmPassword}
          placeholder="Type it once more"
          autoComplete="new-password"
        />

        {/* Resetting signs out every other browser, so a stranger who got in is removed too. */}
        <p className="text-2xs leading-relaxed text-muted">
          Setting a new password signs you out everywhere else, on every device.
        </p>

        <Button type="submit" variant="accent" arrow disabled={isBusy} className="w-full">
          {buttonLabel}
        </Button>
      </form>
    </AuthLayout>
  );
}
