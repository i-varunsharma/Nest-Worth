import { useEffect, useRef, useState } from 'react';

/*
  GoogleButton
  ------------
  "Continue with Google", for real.

  How the whole thing works, end to end:

    1. index.html loads Google's script, which puts a "google" object on window.
    2. We tell it our client id and give it a function to call when somebody
       signs in.
    3. It draws its own button. When pressed, Google opens its window, the
       person picks an account, and Google calls our function with a token.
    4. We hand that token to our server, which asks Google whether it is
       genuine before believing a word of it.

  Step 4 is the one that matters. The token is just text arriving from a
  browser, and anybody can send our server made-up text. Only Google can say
  whether a token is really theirs, which is why the server checks rather than
  trusting what it was handed.

  Why Google's own button rather than ours: this flow only hands out a token
  through a button Google itself draws. Faking a click on a hidden one is
  against their terms and breaks without warning. Their button is configurable
  enough to sit comfortably in our design.

  Props:
    onCredential - called with the token string once Google returns one
*/

// Read at build time from frontend/.env.local. Vite replaces this with the
// real text when it builds, so there is nothing to look up at runtime.
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// How long to wait for Google's script before giving up, in tenths of a second.
const MAX_TRIES = 40;

export default function GoogleButton({ onCredential }) {
  const containerRef = useRef(null);

  /*
    'loading' while we wait for Google's script, then 'ready' or 'unavailable'.

    With no client id there is nothing to wait for, so it starts as unavailable
    rather than showing a spinner that will never finish.
  */
  const [status, setStatus] = useState(() => {
    if (CLIENT_ID) {
      return 'loading';
    }
    return 'unavailable';
  });

  /*
    Keep the newest onCredential in a box.

    The effect below runs once, but the function it was given could be replaced
    on any later render. Reading it out of a ref means Google always calls the
    current one, without having to tear down and rebuild the button every time
    the page re-renders.
  */
  const callbackRef = useRef(onCredential);

  // Updating the box has to happen in an effect, not while rendering. React
  // treats rendering as something it may run more than once or throw away, so
  // changing anything outside the component during it is a bug waiting to
  // happen. This effect has no dependency list, so it runs after every render.
  useEffect(() => {
    callbackRef.current = onCredential;
  });

  useEffect(() => {
    // No client id means Google was never set up, and the status already says
    // so. Nothing to wait for. See SETUP.md.
    if (!CLIENT_ID) {
      return;
    }

    let cancelled = false;
    let tries = 0;

    /*
      Google's script is loaded with "async", so it may not have arrived yet
      when this component first appears. We look every tenth of a second until
      it turns up, and give up after four seconds.

      Waiting like this is not elegant, but it is honest: we do not control when
      an outside script finishes loading, and the alternatives are worse.
    */
    const setUpButton = () => {
      if (cancelled === true) {
        return;
      }

      const hasLoaded = window.google && window.google.accounts && window.google.accounts.id;

      if (!hasLoaded) {
        tries = tries + 1;

        if (tries > MAX_TRIES) {
          // Usually an ad blocker, or no internet.
          setStatus('unavailable');
          return;
        }

        setTimeout(setUpButton, 100);
        return;
      }

      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,

        // Google calls this with { credential }, where credential is the token.
        callback: (response) => {
          callbackRef.current(response.credential);
        },
      });

      // Match the button to the width of the column it sits in, so it lines up
      // with the form below it on a phone as well as on a monitor.
      let width = 380;
      if (containerRef.current && containerRef.current.offsetWidth > 0) {
        width = Math.round(containerRef.current.offsetWidth);
      }

      window.google.accounts.id.renderButton(containerRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: 'continue_with',
        logo_alignment: 'center',
        width: width,
      });

      setStatus('ready');
    };

    setUpButton();

    // Stops the polling if this component leaves the screen mid-wait.
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      {/* Google draws its button inside this box. It has to exist before the
          library is told to render, which is why it is always here. */}
      <div ref={containerRef} className="flex min-h-[44px] justify-center" />

      {status === 'loading' ? (
        <p className="text-center text-2xs text-muted">Loading Google sign-in…</p>
      ) : null}

      {status === 'unavailable' ? (
        <div className="rounded-xl border border-line bg-paperDeep px-4 py-3 text-center">
          <p className="text-[13px] text-ink2">
            Google sign-in is unavailable.
          </p>
          <p className="mt-1 text-2xs text-muted">
            {CLIENT_ID
              ? 'The script did not load. An ad blocker or a dropped connection is the usual cause.'
              : 'No client id is set. See SETUP.md.'}
          </p>
        </div>
      ) : null}
    </div>
  );
}
