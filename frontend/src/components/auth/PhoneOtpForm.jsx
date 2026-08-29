import { useEffect, useState } from 'react';
import Button from '../shared/Button';
import TextField from '../shared/TextField';
import { checkOtp, checkPhone, keepOnlyDigits } from '../../lib/validation';

/*
  PhoneOtpForm
  ------------
  Signing in with a mobile number, in two steps.

    Step 1  "number"  ->  type your number, press Send code
    Step 2  "code"    ->  type the 6 digits from the text message

  Both the login page and the signup page use this same component, so the flow
  only exists in one place.

  IMPORTANT, and worth saying out loud in an interview:
  nothing here proves who anybody is. There is no real text message yet, and the
  code is not really checked. Checking an OTP in the browser would be pointless,
  because anyone can open the developer tools and change what the browser thinks.
  The real check always happens on the server. The two comments marked
  "SEND THE CODE" and "CHECK THE CODE" are the exact places the server calls go.
  SETUP.md explains what to sign up for and what to build.

  Props:
    onVerified - a function to run once the code has been accepted
*/

// How long to wait before the "Resend code" link becomes clickable again.
// A wait like this stops someone hammering the button, which matters because
// every text message costs real money.
const RESEND_WAIT_SECONDS = 30;

/*
  Turns "9876543210" into "98765 43210", which is far easier to read back and
  check than ten digits in a row.
*/
function formatForDisplay(digits) {
  if (digits.length !== 10) {
    return digits;
  }

  return digits.slice(0, 5) + ' ' + digits.slice(5);
}

export default function PhoneOtpForm({ onVerified }) {
  // Which of the two steps we are on.
  const [step, setStep] = useState('number');

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');

  const [phoneError, setPhoneError] = useState('');
  const [codeError, setCodeError] = useState('');

  // Counts down to zero after a code is sent. Zero means "you may resend now".
  const [secondsLeft, setSecondsLeft] = useState(0);

  /*
    The countdown.

    Every time secondsLeft changes, this sets one timer for one second, and that
    timer lowers the number by one. Lowering it changes secondsLeft, which runs
    this again, and so on down to zero. At zero we stop.

    The returned function cancels the pending timer. React runs it before the
    next round and when the component is removed from the screen, which stops a
    timer firing after the form is gone.
  */
  useEffect(() => {
    if (secondsLeft <= 0) {
      return;
    }

    const timerId = setTimeout(() => {
      setSecondsLeft(secondsLeft - 1);
    }, 1000);

    return () => {
      clearTimeout(timerId);
    };
  }, [secondsLeft]);

  const handleSendCode = (event) => {
    event.preventDefault();

    const error = checkPhone(phone);
    setPhoneError(error);

    if (error) {
      return;
    }

    // ----- SEND THE CODE -----
    // A real app would call its own backend here, something like
    // POST /api/auth/otp/send with the phone number, and the backend would ask
    // the SMS provider to deliver a code. See SETUP.md.

    setStep('code');
    setSecondsLeft(RESEND_WAIT_SECONDS);
  };

  const handleVerifyCode = (event) => {
    event.preventDefault();

    const error = checkOtp(code);
    setCodeError(error);

    if (error) {
      return;
    }

    // ----- CHECK THE CODE -----
    // A real app would call POST /api/auth/otp/verify with the number and the
    // code, and the backend would decide whether it is right. Never decide that
    // here. See SETUP.md.

    onVerified(formatForDisplay(keepOnlyDigits(phone)));
  };

  const handleResend = () => {
    if (secondsLeft > 0) {
      return;
    }

    setCode('');
    setCodeError('');
    setSecondsLeft(RESEND_WAIT_SECONDS);

    // ----- SEND THE CODE (again) -----
  };

  const handleChangeNumber = () => {
    setStep('number');
    setCode('');
    setCodeError('');
    setSecondsLeft(0);
  };

  // ---------------------------------------------------------------
  // Step 1: ask for the number
  // ---------------------------------------------------------------
  if (step === 'number') {
    return (
      <form onSubmit={handleSendCode} noValidate className="space-y-5">
        <TextField
          id="phone"
          label="Mobile number"
          type="tel"
          value={phone}
          onChange={setPhone}
          error={phoneError}
          placeholder="98765 43210"
          prefix="+91"
          inputMode="numeric"
          autoComplete="tel"
          hint="We will text you a 6 digit code. Standard rates apply."
        />

        <Button type="submit" variant="accent" arrow className="w-full">
          Send code
        </Button>
      </form>
    );
  }

  // ---------------------------------------------------------------
  // Step 2: ask for the code
  // ---------------------------------------------------------------

  // The "Resend code" line changes while the countdown is running.
  let resendArea = null;
  if (secondsLeft > 0) {
    resendArea = (
      <span className="tnum text-[13px] text-muted">
        Resend code in {secondsLeft}s
      </span>
    );
  } else {
    resendArea = (
      <button
        type="button"
        onClick={handleResend}
        className="sweep text-[13px] font-medium text-ink transition-colors hover:text-accent"
      >
        Resend code
      </button>
    );
  }

  return (
    <form onSubmit={handleVerifyCode} noValidate className="space-y-5">

      <div className="rounded-2xl border border-line bg-paperDeep px-4 py-3.5">
        <p className="text-[13.5px] text-ink2">
          Code sent to{' '}
          <span className="tnum font-semibold text-ink">
            +91 {formatForDisplay(keepOnlyDigits(phone))}
          </span>
        </p>
        <button
          type="button"
          onClick={handleChangeNumber}
          className="sweep mt-1.5 text-[13px] font-medium text-muted transition-colors hover:text-ink"
        >
          Use a different number
        </button>
      </div>

      <div>
        <label htmlFor="otp" className="mb-2 block text-[13px] font-medium text-ink2">
          6 digit code
        </label>

        {/*
          One wide box rather than six little ones. It is far less code, it works
          properly with a password manager, and autoComplete="one-time-code" lets
          phones offer the code from the text message with a single tap, which six
          separate boxes tend to break.

          The wide letter spacing is what makes it LOOK like separate digits.
        */}
        <input
          id="otp"
          name="otp"
          type="text"
          value={code}
          onChange={(event) => setCode(keepOnlyDigits(event.target.value))}
          placeholder="000000"
          inputMode="numeric"
          maxLength={6}
          autoComplete="one-time-code"
          className={
            'tnum w-full rounded-xl border bg-surface py-3.5 text-center text-[24px] '
            + 'tracking-[0.45em] text-ink outline-none transition-colors duration-300 '
            + 'placeholder:text-muted/40 '
            + (codeError ? 'border-clay' : 'border-line focus:border-accent')
          }
        />

        {codeError ? <p className="mt-2 text-2xs text-clay">{codeError}</p> : null}
      </div>

      <div className="flex items-center justify-between">
        {resendArea}
        <span className="text-2xs text-muted">Codes expire in 10 minutes</span>
      </div>

      <Button type="submit" variant="accent" arrow className="w-full">
        Verify and continue
      </Button>
    </form>
  );
}
