import { useEffect, useState } from 'react';
import Button from '../shared/Button';
import TextField from '../shared/TextField';
import * as api from '../../lib/api';
import { checkOtp, checkPhone, keepOnlyDigits } from '../../lib/validation';

/*
  PhoneOtpForm
  ------------
  Signing in with a mobile number, in two steps.

    Step 1  "number"  ->  type your number, press Send code
    Step 2  "code"    ->  type the 6 digits we texted you

  Both the login and signup pages use this same component, so the flow exists in
  one place only.

  Where the real work happens: the server. This form checks that what was typed
  LOOKS right before bothering the network, but it has no idea whether a code is
  correct. It sends it to /api/auth/otp/verify and shows whatever comes back.
  Checking a code in the browser would be pointless, because anyone can edit
  what runs in their own browser.

  Props:
    onVerified - runs once the server accepts the code, given (user, isNew)
*/

// How long before "Resend code" becomes clickable again. The server enforces
// the same wait, so this is only here to save people a pointless click.
const RESEND_WAIT_SECONDS = 30;

/* Turns "9876543210" into "98765 43210", which is easier to read back. */
function formatForDisplay(digits) {
  if (digits.length !== 10) {
    return digits;
  }
  return digits.slice(0, 5) + ' ' + digits.slice(5);
}

export default function PhoneOtpForm({ onVerified }) {
  const [step, setStep] = useState('number');

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');

  const [phoneError, setPhoneError] = useState('');
  const [codeError, setCodeError] = useState('');

  // True while we are waiting for the server, so the button can be disabled.
  // Without this, an impatient double click sends two requests.
  const [isBusy, setIsBusy] = useState(false);

  const [secondsLeft, setSecondsLeft] = useState(0);

  /*
    The countdown.

    Each time secondsLeft changes, this sets one timer for one second, and that
    timer lowers the number by one. Lowering it runs this again, and so on down
    to zero, where we stop.

    The returned function cancels the pending timer. React runs it before the
    next round and when this form leaves the screen, which stops a timer firing
    into a component that is no longer there.
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


  const handleSendCode = async (event) => {
    event.preventDefault();

    // Check the shape here first. No point asking the server about something
    // that is obviously not a phone number.
    const localError = checkPhone(phone);
    if (localError) {
      setPhoneError(localError);
      return;
    }

    setPhoneError('');
    setIsBusy(true);

    const result = await api.sendOtp(phone);

    setIsBusy(false);

    if (!result.ok) {
      setPhoneError(result.error);
      return;
    }

    setStep('code');
    setSecondsLeft(RESEND_WAIT_SECONDS);
  };


  const handleVerifyCode = async (event) => {
    event.preventDefault();

    const localError = checkOtp(code);
    if (localError) {
      setCodeError(localError);
      return;
    }

    setCodeError('');
    setIsBusy(true);

    const result = await api.verifyOtp(phone, code);

    setIsBusy(false);

    if (!result.ok) {
      // The server counts down the tries left and says so in its message.
      setCodeError(result.error);
      return;
    }

    onVerified(result.data.user, result.data.isNew);
  };


  const handleResend = async () => {
    if (secondsLeft > 0 || isBusy === true) {
      return;
    }

    setCode('');
    setCodeError('');
    setIsBusy(true);

    const result = await api.sendOtp(phone);

    setIsBusy(false);

    if (!result.ok) {
      setCodeError(result.error);
      return;
    }

    setSecondsLeft(RESEND_WAIT_SECONDS);
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
    let sendLabel = 'Send code';
    if (isBusy === true) {
      sendLabel = 'Sending…';
    }

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
          hint="We will text you a 6 digit code."
        />

        <Button type="submit" variant="accent" arrow disabled={isBusy} className="w-full">
          {sendLabel}
        </Button>
      </form>
    );
  }


  // ---------------------------------------------------------------
  // Step 2: ask for the code
  // ---------------------------------------------------------------

  // The resend line changes while the countdown is running.
  let resendArea = null;
  if (secondsLeft > 0) {
    resendArea = (
      <span className="tnum text-[13px] text-muted">Resend code in {secondsLeft}s</span>
    );
  } else {
    resendArea = (
      <button
        type="button"
        onClick={handleResend}
        disabled={isBusy}
        className="sweep text-[13px] font-medium text-ink transition-colors hover:text-accent disabled:opacity-50"
      >
        Resend code
      </button>
    );
  }

  let verifyLabel = 'Verify and continue';
  if (isBusy === true) {
    verifyLabel = 'Checking…';
  }

  let codeBoxClasses =
    'tnum w-full rounded-xl border bg-surface py-3.5 text-center text-[24px] '
    + 'tracking-[0.45em] text-ink outline-none transition-colors duration-300 '
    + 'placeholder:text-muted/40 ';

  if (codeError) {
    codeBoxClasses = codeBoxClasses + 'border-clay';
  } else {
    codeBoxClasses = codeBoxClasses + 'border-line focus:border-accent';
  }

  return (
    <form onSubmit={handleVerifyCode} noValidate className="space-y-5">

      <div className="rounded-xl border border-line bg-paperDeep px-4 py-3.5">
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
          One wide box rather than six little ones. Far less code, it works with
          password managers, and autoComplete="one-time-code" lets a phone offer
          the code straight from the text message, which six boxes tend to break.
          The wide letter spacing is what makes it look like separate digits.
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
          className={codeBoxClasses}
        />

        {codeError ? <p className="mt-2 text-2xs text-clay">{codeError}</p> : null}
      </div>

      <div className="flex items-center justify-between">
        {resendArea}
        <span className="text-2xs text-muted">Codes expire in 10 minutes</span>
      </div>

      <Button type="submit" variant="accent" arrow disabled={isBusy} className="w-full">
        {verifyLabel}
      </Button>
    </form>
  );
}
