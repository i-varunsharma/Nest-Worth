/*
  Which ways of signing in are switched on. Both are read at build time, so
  changing them on Vercel needs a redeploy.

  On your own machine (DEV) both always show, so a missing setting shows its
  own explanation instead of quietly disappearing.
*/

// Set in frontend/.env.local, and in Vercel's environment variables for the live site.
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export const GOOGLE_SIGN_IN_ON = import.meta.env.DEV === true || Boolean(GOOGLE_CLIENT_ID);

/*
  Phone sign-in needs an SMS provider, and none is connected yet: the server
  only prints the code in its own log. So on the live site the Phone tab is
  hidden until VITE_PHONE_SIGN_IN is set to "true".
*/
export const PHONE_SIGN_IN_ON = import.meta.env.DEV === true || import.meta.env.VITE_PHONE_SIGN_IN === 'true';
