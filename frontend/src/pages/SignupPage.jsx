import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import AuthDivider from '../components/auth/AuthDivider';
import GoogleButton from '../components/auth/GoogleButton';
import MethodTabs from '../components/auth/MethodTabs';
import PhoneOtpForm from '../components/auth/PhoneOtpForm';
import Button from '../components/shared/Button';
import TextField from '../components/shared/TextField';
import { checkEmail, checkName, checkPassword } from '../lib/validation';

/*
  SignupPage
  ----------
  The screen at /signup. It mirrors the login page, with three ways to start:

    1. Continue with Google
    2. Name, email and password
    3. Mobile number and a code sent by text

  The only rule that differs from the login page is that a brand new password
  has to be at least 8 characters long.
*/

const sellingPoints = [
  'A plan built from your household, not a borrowed rule of thumb',
  'Takes about three minutes to set up',
  'Free while we are in beta',
];

export default function SignupPage() {
  const [method, setMethod] = useState('email');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [errors, setErrors] = useState({});
  const [successText, setSuccessText] = useState(null);

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
    // A real app would call POST /api/auth/signup here.
    setSuccessText('Welcome, ' + name + '. We would create the account for ' + email + ' now.');
  };

  const handleGoogleClick = () => {
    // ----- SIGN UP WITH GOOGLE -----
    // See SETUP.md for what has to exist before this can do anything real.
    setSuccessText('We would open the Google sign-in window now.');
  };

  const handlePhoneVerified = (phoneNumber) => {
    setSuccessText('We would create the account for +91 ' + phoneNumber + ' now.');
  };

  if (successText !== null) {
    return (
      <AuthLayout
        title="Account ready."
        subtitle="Next we would ask about your household and build your first plan."
        points={sellingPoints}
        footer={<Link to="/" className="sweep font-medium text-ink">Back to the home page</Link>}
      >
        <div className="rounded-2xl border border-accent/25 bg-accentSoft p-5">
          <p className="text-2xs font-semibold uppercase tracking-widest2 text-accentDeep">
            Form accepted
          </p>
          <p className="mt-2 text-[14px] leading-relaxed text-ink2">{successText}</p>
        </div>
      </AuthLayout>
    );
  }

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
