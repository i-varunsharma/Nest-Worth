import { useEffect, useRef, useState } from 'react';

/*
  "Continue with Google".

    1. index.html loads Google's script, which adds window.google.
    2. It is given the client id and a callback, and draws its own button.
    3. After sign-in, Google calls the callback with a token.
    4. The token goes to our server, which asks Google whether it is genuine.

  Google's own button is required: this flow only issues a token through it.

  Props:
    onCredential  called with the token
*/

// Read at build time from frontend/.env.local. Vite replaces this with the
// real text when it builds, so there is nothing to look up at runtime.
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// How long to wait for Google's script before giving up, in tenths of a second.
const MAX_TRIES = 40;

export default function GoogleButton({ onCredential }) {
  const containerRef = useRef(null);

  // 'loading' while Google's script arrives, then 'ready' or 'unavailable'. With no
  // client id it starts unavailable, rather than waiting forever.
  const [status, setStatus] = useState(() => {
    if (CLIENT_ID) {
      return 'loading';
    }
    return 'unavailable';
  });

  // The newest onCredential, in a ref, so Google always calls the current one without
  // the button being rebuilt.
  const callbackRef = useRef(onCredential);

  // Updating the box happens in an effect, not while rendering. React may run
  // a render more than once or throw it away, so changing anything outside the
  // component during one is unsafe. No dependency list means every render.
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

    // Google's script loads asynchronously. Check every 100ms and give up after four seconds.
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

      // Match the width of the column it sits in, so it lines up with the form
      // below on a phone as well as a monitor.
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
