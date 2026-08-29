import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import AuthDivider from '../components/auth/AuthDivider';
import GoogleButton from '../components/auth/GoogleButton';
import MethodTabs from '../components/auth/MethodTabs';
import PhoneOtpForm from '../components/auth/PhoneOtpForm';
import Button from '../components/shared/Button';
import TextField from '../components/shared/TextField';
import { checkEmail, checkPassword } from '../lib/validation';

/*
  LoginPage
  ---------
  The screen at /login. It offers three ways in:

    1. Continue with Google
    2. Email and password
    3. Mobile number and a code sent by text

  Google and the text message both need accounts set up with outside services,
  which SETUP.md walks through. Until then every route ends at the same friendly
  confirmation panel, so the whole screen can still be clicked through and shown
  to somebody.
*/

// Shown on the dark panel on the left. Kept outside the component because it
// never changes, so there is no reason to rebuild the list on every render.
const sellingPoints = [
  'Your plan, recalculated from your real household',
  'Every number comes with the reasoning behind it',
  'No bank login, ever',
];

export default function LoginPage() {
  // Which of the two forms is showing: 'email' or 'phone'.
  const [method, setMethod] = useState('email');

  // One piece of state per input box. Each starts as an empty string.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Error messages, stored by field name. An empty object means no errors yet.
  const [errors, setErrors] = useState({});

  // Null until something succeeds. Then it holds the line to show the person.
  const [successText, setSuccessText] = useState(null);

  const handleEmailSubmit = (event) => {
    // A form normally reloads the whole page when it is sent.
    // This line stops that, so React can handle it instead.
    event.preventDefault();

    // Collect every problem first, so the person sees all of them at once
    // rather than fixing one, pressing the button, and finding another.
    const foundErrors = {};

    const emailError = checkEmail(email);
    if (emailError) {
      foundErrors.email = emailError;
    }

    // "false" means: do not demand a strong password on the login screen.
    const passwordError = checkPassword(password, false);
    if (passwordError) {
      foundErrors.password = passwordError;
    }

    setErrors(foundErrors);

    // Object.keys turns { email: '...' } into [ 'email' ], so its length tells
    // us how many problems were found. Stop here if there were any.
    if (Object.keys(foundErrors).length > 0) {
      return;
    }

    // ----- SIGN IN -----
    // A real app would call POST /api/auth/login here.
    setSuccessText('We would sign in ' + email + ' now.');
  };

  const handleGoogleClick = () => {
    // ----- SIGN IN WITH GOOGLE -----
    // Once a Client ID exists this opens Google's own sign-in window, and the
    // token it returns goes to our backend to be checked. See SETUP.md.
    setSuccessText('We would open the Google sign-in window now.');
  };

  const handlePhoneVerified = (phoneNumber) => {
    setSuccessText('We would sign in the account for +91 ' + phoneNumber + ' now.');
  };

  // Once something has succeeded we swap the whole form for a short message.
  if (successText !== null) {
    return (
      <AuthLayout
        title="You are all set."
        subtitle="This is where we would sign you in and open your plan. The backend is not connected yet."
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
      // noValidate turns off the browser's own pop-up messages, so that our
      // error text below each field is the only thing people see.
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

          <a href="#reset" className="sweep text-[13.5px] text-muted transition-colors hover:text-ink">
            Forgot password?
          </a>
        </div>

        {/* type="submit" is what connects this button to the form's onSubmit. */}
        <Button type="submit" variant="accent" arrow className="w-full">
          Sign in
        </Button>
      </form>
    );
  }

  return (
    <AuthLayout
      title="Welcome back."
      subtitle="Sign in to pick up your plan where you left it."
      points={sellingPoints}
      footer={
        <span>
          New here?{' '}
          <Link to="/signup" className="sweep font-medium text-ink">Create an account</Link>
        </span>
      }
    >
      <div className="space-y-6">
        <GoogleButton onClick={handleGoogleClick} />

        <AuthDivider />

        <MethodTabs value={method} onChange={setMethod} />

        {chosenForm}
      </div>
    </AuthLayout>
  );
}
