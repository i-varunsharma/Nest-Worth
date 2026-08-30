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
import { checkEmail, checkName, checkPassword } from '../lib/validation';

/*
  SignupPage
  ----------
  The screen at /signup. It mirrors the login page, with three ways to start.

  Two things differ from signing in:

    1. A brand new password has to be at least 8 characters. The server insists
       on this too, and refuses anything over 72 characters, because bcrypt
       ignores everything past that length.

    2. It goes to /onboarding rather than /dashboard. Somebody who has just made
       an account has told us nothing about their household, so there is no plan
       to show them yet. The three questions come first.
*/

export default function SignupPage() {
  const navigate = useNavigate();

  const [method, setMethod] = useState('email');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isBusy, setIsBusy] = useState(false);


  const handleEmailSubmit = async (event) => {
    event.preventDefault();

    // Gather every obvious problem before showing anything.
    const foundErrors = {};

    const nameError = checkName(name);
    if (nameError) {
      foundErrors.name = nameError;
    }

    const emailError = checkEmail(email);
    if (emailError) {
      foundErrors.email = emailError;
    }

    // "true" means: this is a brand new password, so ask for a decent one.
    const passwordError = checkPassword(password, true);
    if (passwordError) {
      foundErrors.password = passwordError;
    }

    if (acceptedTerms === false) {
      foundErrors.terms = 'Please accept the terms before continuing.';
    }

    setErrors(foundErrors);
    setFormError('');

    if (Object.keys(foundErrors).length > 0) {
      return;
    }

    setIsBusy(true);
    const result = await api.signup(name, email, password);
    setIsBusy(false);

    if (!result.ok) {
      // The most likely failure here is "that email is already taken", and the
      // server tells us it was the email field, so the message lands under it.
      if (result.field) {
        setErrors({ [result.field]: result.error });
      } else {
        setFormError(result.error);
      }
      return;
    }

    navigate('/onboarding');
  };


  const handleGoogleClick = async () => {
    setFormError('');
    setIsBusy(true);

    // No Google Client ID yet, so there is no token to send and the server
    // says so plainly. SETUP.md has the steps to switch this on.
    const result = await api.google('');

    setIsBusy(false);

    if (!result.ok) {
      setFormError(result.error);
      return;
    }

    navigate('/onboarding');
  };


  const handlePhoneVerified = () => {
    // Signing up by phone gives us no name, so onboarding asks for it.
    navigate('/onboarding');
  };


  let createLabel = 'Create account';
  if (isBusy === true) {
    createLabel = 'Creating…';
  }

  let chosenForm = null;

  if (method === 'phone') {
    chosenForm = <PhoneOtpForm onVerified={handlePhoneVerified} />;
  } else {
    chosenForm = (
      <form onSubmit={handleEmailSubmit} noValidate className="space-y-5">
        <TextField
          id="name"
          label="Full name"
          type="text"
          value={name}
          onChange={setName}
          error={errors.name}
          placeholder="Varun Sharma"
          autoComplete="name"
        />

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
          placeholder="At least 8 characters"
          autoComplete="new-password"
          hint="Eight characters or more. A short phrase beats a clever word."
        />

        <div>
          <label htmlFor="terms" className="flex cursor-pointer items-start gap-2.5 text-[13.5px] leading-relaxed text-ink2">
            <input
              id="terms"
              type="checkbox"
              checked={acceptedTerms}
              onChange={(event) => setAcceptedTerms(event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-line accent-accent"
            />
            I agree that Nestworth gives educational guidance, not regulated investment advice.
          </label>

          {errors.terms ? <p className="mt-2 text-2xs text-clay">{errors.terms}</p> : null}
        </div>

        <Button type="submit" variant="accent" arrow disabled={isBusy} className="w-full">
          {createLabel}
        </Button>
      </form>
    );
  }

  return (
    <AuthLayout
      title="Start with your household."
      subtitle="Three minutes, no bank account, and a plan that accounts for everyone your salary carries."
      footer={
        <span>
          Already have an account?{' '}
          <Link to="/login" className="sweep font-medium text-ink">Sign in</Link>
        </span>
      }
    >
      <div className="space-y-6">

        {formError ? (
          <p className="rounded-xl border border-clay/25 bg-claySoft px-4 py-3 text-[13.5px] text-clay">
            {formError}
          </p>
        ) : null}

        <GoogleButton onClick={handleGoogleClick} label="Sign up with Google" />

        <AuthDivider />

        <MethodTabs value={method} onChange={setMethod} />

        {chosenForm}

        <p className="text-center text-2xs leading-relaxed text-muted">
          We never ask for a bank login, and we do not sell what you tell us.
        </p>
      </div>
    </AuthLayout>
  );
}
