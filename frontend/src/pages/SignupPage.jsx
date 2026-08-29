import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import AuthDivider from '../components/auth/AuthDivider';
import GoogleButton from '../components/auth/GoogleButton';
import MethodTabs from '../components/auth/MethodTabs';
import PhoneOtpForm from '../components/auth/PhoneOtpForm';
import Button from '../components/shared/Button';
import TextField from '../components/shared/TextField';
import { checkEmail, checkName, checkPassword } from '../lib/validation';
import { loadHousehold, saveHousehold } from '../lib/household';

/*
  SignupPage
  ----------
  The screen at /signup. It mirrors the login page, with three ways to start:

    1. Continue with Google
    2. Name, email and password
    3. Mobile number and a code sent by text

  The only rule that differs from the login page is that a brand new password
  has to be at least 8 characters long.

  Where it goes next: /onboarding, not the dashboard. Somebody who has just
  signed up has not told us anything about their household yet, so there is no
  plan to show them. The three questions come first.
*/

const sellingPoints = [
  'A plan built from your household, not a borrowed rule of thumb',
  'Takes about three minutes to set up',
  'Free while we are in beta',
];

export default function SignupPage() {
  // useNavigate moves to another page from inside our own code.
  const navigate = useNavigate();

  const [method, setMethod] = useState('email');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [errors, setErrors] = useState({});

  const handleEmailSubmit = (event) => {
    // Stop the browser from reloading the page when the form is sent.
    event.preventDefault();

    // Gather every problem before showing anything, so the person can fix
    // them all in one go.
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

    if (Object.keys(foundErrors).length > 0) {
      return;
    }

    // ----- CREATE THE ACCOUNT -----
    // A real app would call POST /api/auth/signup here, and only continue once
    // the server confirmed the account was made.

    // Remember the name so the dashboard can say hello properly. The rest of
    // the household gets filled in by the onboarding questions next.
    saveHousehold({ ...loadHousehold(), name: name.trim() });
    navigate('/onboarding');
  };

  const handleGoogleClick = () => {
    // ----- SIGN UP WITH GOOGLE -----
    // Google would give us the person's name here, which is why nothing is
    // saved yet. See SETUP.md for what has to exist before this works.
    navigate('/onboarding');
  };

  const handlePhoneVerified = () => {
    // Signing up by phone gives us no name, so the dashboard greets them
    // without one until they add it.
    navigate('/onboarding');
  };

  // Choose which form to show under the tabs.
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

        <Button type="submit" variant="accent" arrow className="w-full">
          Create account
        </Button>
      </form>
    );
  }

  return (
    <AuthLayout
      title="Start with your household."
      subtitle="Three minutes, no bank account, and a plan that accounts for everyone your salary carries."
      points={sellingPoints}
      footer={
        <span>
          Already have an account?{' '}
          <Link to="/login" className="sweep font-medium text-ink">Sign in</Link>
        </span>
      }
    >
      <div className="space-y-6">
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
