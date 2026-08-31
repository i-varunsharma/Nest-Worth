import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import Button from '../components/shared/Button';
import TextField from '../components/shared/TextField';
import * as api from '../lib/api';
import { checkEmail } from '../lib/validation';

/*
  The screen at /forgot-password. Step one of two.

  Somebody types their email, and the server sends a link to it. Pressing the
  link opens ResetPasswordPage, where they choose a new password.

  The one surprising thing on this page is what happens after the form is sent.
  We show the same confirmation whether or not that email has an account,
  because the server deliberately answers the same way either way. If it did
  not, this form could be used as a way to check which of your friends have
  signed up: type an address, see which message comes back.

  That means a person who mistypes their address is left waiting for an email
  that will never arrive, which is why the confirmation below says out loud to
  check the address if nothing turns up. It is the honest way to soften a
  trade-off we cannot avoid.
*/

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');

  // A message that belongs under the email box.
  const [emailError, setEmailError] = useState('');

  // A message about the whole attempt, such as the server being unreachable.
  const [formError, setFormError] = useState('');

  // Once this is true we hide the form and show the confirmation instead.
  const [isSent, setIsSent] = useState(false);

  const [isBusy, setIsBusy] = useState(false);


  const handleSubmit = async (event) => {
    // Without this the browser reloads the whole page when the form is sent.
    event.preventDefault();

    // Round one: catch the obvious mistakes here, without troubling the server.
    const foundError = checkEmail(email);

    setEmailError(foundError);
    setFormError('');

    if (foundError) {
      return;
    }

    // Round two: ask the server.
    setIsBusy(true);
    const result = await api.forgotPassword(email);
    setIsBusy(false);

    if (!result.ok) {
      // The only failures that reach here are a malformed address or the rate
      // limit, since the server does not report whether the account exists.
      if (result.field === 'email') {
        setEmailError(result.error);
      } else {
        setFormError(result.error);
      }
      return;
    }

    setIsSent(true);
  };


  let buttonLabel = 'Send reset link';
  if (isBusy === true) {
    buttonLabel = 'Sending…';
  }


  /*
    The confirmation, shown after the form has been sent.

    Pulled out into its own variable rather than written inline below, so the
    return statement at the bottom of this file stays short enough to read in
    one go.
  */
  let body = null;

  if (isSent === true) {
    body = (
      <div className="space-y-5">
        <div className="rounded-xl border border-line bg-paperDeep px-5 py-5">
          <p className="text-[14.5px] leading-relaxed text-ink">
            If there is an account for <span className="font-medium">{email}</span>, a
            reset link is on its way.
          </p>
          <p className="mt-3 text-[13.5px] leading-relaxed text-ink2">
            The link works once, and stops working after an hour. If nothing
            arrives in a few minutes, check the address above for a typo and
            try again.
          </p>
        </div>

        {/*
          While there is no email provider connected, the link is printed in the
          terminal running the API instead of being sent anywhere. Saying so
          here saves the next person a confusing ten minutes.
        */}
        <p className="rounded-xl border border-line bg-surface px-4 py-3 text-2xs leading-relaxed text-muted">
          Running this locally? No email provider is connected yet, so the link
          is printed in the terminal running the backend. See SETUP.md.
        </p>

        <Button to="/login" variant="outline" className="w-full">
          Back to sign in
        </Button>
      </div>
    );
  } else {
    body = (
      // noValidate switches off the browser's own pop-ups, so the message under
      // the box is the only one people see.
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {formError ? (
          <p className="rounded-xl border border-clay/25 bg-claySoft px-4 py-3 text-[13.5px] text-clay">
            {formError}
          </p>
        ) : null}

        <TextField
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          error={emailError}
          placeholder="you@example.com"
          autoComplete="email"
          hint="The address you signed up with."
        />

        <Button type="submit" variant="accent" arrow disabled={isBusy} className="w-full">
          {buttonLabel}
        </Button>
      </form>
    );
  }


  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Give us the email on your account and we will send you a link to set a new one."
      footer={
        <span>
          Remembered it?{' '}
          <Link to="/login" className="sweep font-medium text-ink">Sign in</Link>
        </span>
      }
    >
      {body}
    </AuthLayout>
  );
}
