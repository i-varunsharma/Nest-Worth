/*
  GoogleButton
  ------------
  The "Continue with Google" button, used on both the login and signup pages.

  RIGHT NOW this button only calls whatever function you pass as onClick.
  It does not talk to Google yet, because that needs two things this project
  does not have: a Client ID from the Google Cloud Console, and a backend that
  can check the token Google hands back.

  See SETUP.md in the project root for the exact steps to switch it on.

  Why the button looks the way it does: Google publishes branding rules for this
  button. The important ones are that the logo keeps its four colours, that the
  text says "Continue with Google" or "Sign in with Google", and that the logo is
  not stretched or recoloured. Following them keeps the app allowed to use it.
*/
export default function GoogleButton({ onClick, label }) {
  // Default the text, so the caller only has to pass it when it differs.
  let buttonText = 'Continue with Google';
  if (label) {
    buttonText = label;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-3 rounded-full border border-line bg-surface px-6 py-3.5 text-[14.5px] font-semibold text-ink transition-all duration-300 ease-smooth hover:border-ink hover:shadow-card"
    >
      {/* The Google "G". Four paths, one for each coloured section of the logo. */}
      <svg viewBox="0 0 18 18" className="h-[18px] w-[18px]" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
        />
        <path
          fill="#34A853"
          d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
        />
        <path
          fill="#FBBC05"
          d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"
        />
        <path
          fill="#EA4335"
          d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
        />
      </svg>

      {buttonText}
    </button>
  );
}
