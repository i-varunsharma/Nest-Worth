import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import AuthDivider from '../components/auth/AuthDivider';
import GoogleButton from '../components/auth/GoogleButton';
import MethodTabs from '../components/auth/MethodTabs';
import PhoneOtpForm from '../components/auth/PhoneOtpForm';
import Button from '../components/shared/Button';
import TextField from '../components/shared/TextField';
import * as api from '../lib/api';
import { checkEmail, checkPassword } from '../lib/validation';

// /login: Google, email and password, or a phone code. The form checks obvious
// mistakes before sending; the server decides whether the password is right.

export default function LoginPage() {
  const navigate = useNavigate();

  // Which form is showing: 'email' or 'phone'.
  const [method, setMethod] = useState('email');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Messages attached to a particular input box.
  const [errors, setErrors] = useState({});

  // A message about the whole form, such as a wrong password or the server
  // being unreachable. It does not belong under any one box.
  const [formError, setFormError] = useState('');

  const [isBusy, setIsBusy] = useState(false);


  const handleEmailSubmit = async (event) => {
    // A form normally reloads the whole page when it is sent. This stops that,
    // so React can handle it instead.
    event.preventDefault();

    // Round one: the obvious mistakes, checked here. Collect them all at once
    // so the person can fix everything in one go.
    const foundErrors = {};

    const emailError = checkEmail(email);
    if (emailError) {
      foundErrors.email = emailError;
    }

    // "false" means: do not demand a strong password on the login screen.
    // Telling someone their existing password is too short helps nobody.
    const passwordError = checkPassword(password, false);
    if (passwordError) {
      foundErrors.password = passwordError;
    }

    setErrors(foundErrors);
    setFormError('');

    if (Object.keys(foundErrors).length > 0) {
      return;
    }

    // Round two: ask the server.
    setIsBusy(true);
    const result = await api.login(email, password);
    setIsBusy(false);

    if (!result.ok) {
      // When the server names a field, put the message under that box.
      // Otherwise show it above the form.
      if (result.field) {
        setErrors({ [result.field]: result.error });
      } else {
        setFormError(result.error);
      }
      return;
    }

    navigate('/dashboard');
  };


  // The token goes to the server, which verifies it with Google. isNew means the
  // account has no household yet, so it goes to onboarding.
  const handleGoogleCredential = async (credential) => {
    setFormError('');
    setIsBusy(true);

    const result = await api.google(credential);

    setIsBusy(false);

    if (!result.ok) {
      setFormError(result.error);
      return;
    }

    if (result.data.isNew === true) {
      navigate('/onboarding');
      return;
    }

    navigate('/dashboard');
  };


  const handlePhoneVerified = (user) => {
    // Somebody signing in by phone for the first time has no name and no
    // household yet, so send them through onboarding instead.
    if (!user.name) {
      navigate('/onboarding');
      return;
    }

    navigate('/dashboard');
  };


  let signInLabel = 'Sign in';
  if (isBusy === true) {
    signInLabel = 'Signing in…';
  }

  // Choose which form sits under the tabs.
  let chosenForm = null;

  if (method === 'phone') {
    chosenForm = <PhoneOtpForm onVerified={handlePhoneVerified} />;
  } else {
    chosenForm = (
      // noValidate switches off the browser's own pop-up messages, so our text
      // under each box is the only thing people see.
      <form onSubmit={handleEmailSubmit} noValidate className="space-y-5">
        <TextField
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          error={errors.email}
          placeholder="you@example.com"
          autoComplete="email"
        />

        <TextField
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          error={errors.password}
          placeholder="Your password"
          autoComplete="current-password"
        />

        <div className="flex items-center justify-between">
          <label htmlFor="remember" className="flex cursor-pointer items-center gap-2.5 text-[13.5px] text-ink2">
            <input
              id="remember"
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="h-4 w-4 cursor-pointer rounded border-line accent-accent"
            />
            Keep me signed in
          </label>

          <Link
            to="/forgot-password"
            className="sweep text-[13.5px] text-muted transition-colors hover:text-ink"
          >
            Forgot password?
          </Link>
        </div>

        {/* type="submit" is what connects this button to the form's onSubmit. */}
        <Button type="submit" variant="accent" arrow disabled={isBusy} className="w-full">
          {signInLabel}
        </Button>
      </form>
    );
  }

  return (
    <AuthLayout
      title="Welcome back."
      subtitle="Sign in to pick up your plan where you left it."
      footer={
        <span>
          New here?{' '}
          <Link to="/signup" className="sweep font-medium text-ink">Create an account</Link>
        </span>
      }
    >
      <div className="space-y-6">

        {/* Problems with the whole attempt, rather than one box. */}
        {formError ? (
          <p className="rounded-xl border border-clay/25 bg-claySoft px-4 py-3 text-[13.5px] text-clay">
            {formError}
          </p>
        ) : null}

        <GoogleButton onCredential={handleGoogleCredential} />

        <AuthDivider />

        <MethodTabs value={method} onChange={setMethod} />

        {chosenForm}
      </div>
    </AuthLayout>
  );
}
