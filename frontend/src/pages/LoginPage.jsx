import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

  All three end in the same place: the dashboard at /dashboard.

  Google and the text message both need accounts set up with outside services,
  which SETUP.md walks through. Until those exist, nothing here actually proves
  who anybody is. The forms check that what was typed makes sense, and then move
  on, so the whole journey can be clicked through and shown to somebody.
*/

// Shown on the dark panel on the left. Kept outside the component because it
// never changes, so there is no reason to rebuild the list on every render.
const sellingPoints = [
  'Your plan, recalculated from your real household',
  'Every number comes with the reasoning behind it',
  'No bank login, ever',
];

export default function LoginPage() {
  // useNavigate gives us a function that moves to another page from inside our
  // own code, rather than waiting for somebody to click a link.
  const navigate = useNavigate();

  // Which of the two forms is showing: 'email' or 'phone'.
  const [method, setMethod] = useState('email');

  // One piece of state per input box. Each starts as an empty string.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Error messages, stored by field name. An empty object means no errors yet.
  const [errors, setErrors] = useState({});

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
    // A real app would call POST /api/auth/login here and only continue once
    // the server said the password was right. Until then we go straight on.
    navigate('/dashboard');
  };

  const handleGoogleClick = () => {
    // ----- SIGN IN WITH GOOGLE -----
    // Once a Client ID exists this opens Google's own sign-in window, and the
    // token it returns goes to our backend to be checked. See SETUP.md.
    navigate('/dashboard');
  };

  const handlePhoneVerified = () => {
    navigate('/dashboard');
  };

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
