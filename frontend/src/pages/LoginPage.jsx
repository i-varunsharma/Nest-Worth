import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import AuthDivider from '../components/auth/AuthDivider';
import GoogleButton from '../components/auth/GoogleButton';
import MethodTabs from '../components/auth/MethodTabs';
import PhoneOtpForm from '../components/auth/PhoneOtpForm';
import Button from '../components/shared/Button';
import Notice from '../components/shared/Notice';
import TextField from '../components/shared/TextField';
import useGoogleSignIn from '../hooks/useGoogleSignIn';
import * as api from '../lib/api';
import { showServerError } from '../lib/formErrors';
import { checkEmail, checkPasswordEntered } from '../lib/validation';

// /login: Google, email and password, or a phone code. The form checks obvious
// mistakes before sending; the server decides whether the password is right.

export default function LoginPage() {
  const navigate = useNavigate();

  // Which form is showing: 'email' or 'phone'.
  const [method, setMethod] = useState('email');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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

    // Only checks something was typed. The server decides if it is right.
    const passwordError = checkPasswordEntered(password);
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

    if (result.ok === false) {
      showServerError(result, setErrors, setFormError);
      return;
    }

    navigate('/dashboard');
  };


  // The same on the signup page, so it lives in hooks/useGoogleSignIn.js.
  const handleGoogleCredential = useGoogleSignIn(setFormError, setIsBusy);


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

        {/* Sessions last 30 days, so there is no "keep me signed in" choice to make. */}
        <div className="flex justify-end">
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
        <Notice tone="error">{formError}</Notice>

        <GoogleButton onCredential={handleGoogleCredential} />

        <AuthDivider />

        <MethodTabs value={method} onChange={setMethod} />

        {chosenForm}
      </div>
    </AuthLayout>
  );
}
