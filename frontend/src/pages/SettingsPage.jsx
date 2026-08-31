import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppShell from '../components/app/AppShell';
import Button from '../components/shared/Button';
import TextField from '../components/shared/TextField';
import * as api from '../lib/api';
import { formatRupees } from '../lib/plan';
import { checkPassword } from '../lib/validation';

/*
  The screen at /settings. Your name, your household, and your account.

  The household questions live in onboarding, and this page links there rather
  than repeating them. Two places to change the same three numbers is two places
  to keep in step, and it is how forms quietly start disagreeing with each other.

  Props:
    user - the signed-in person, handed down by RequireAuth
*/

export default function SettingsPage({ user }) {
  const navigate = useNavigate();

  const [name, setName] = useState(user.name || '');
  const [household, setHousehold] = useState(null);

  const [nameError, setNameError] = useState('');
  const [nameSaved, setNameSaved] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);

  // The danger zone at the bottom. It stays folded away until asked for, so
  // "delete everything" is never one stray click from the rest of the page.
  const [isClosing, setIsClosing] = useState(false);
  const [closePassword, setClosePassword] = useState('');
  const [closeConfirmText, setCloseConfirmText] = useState('');
  const [closeError, setCloseError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    // Set to false when this page is left, so an answer that arrives afterwards
    // does not try to update state that has gone.
    let stillMounted = true;

    api.getHousehold().then((result) => {
      if (!stillMounted) {
        return;
      }

      if (result.ok) {
        setHousehold(result.data.household);
      }
    });

    return () => {
      stillMounted = false;
    };
  }, []);

  const handleSaveName = async (event) => {
    event.preventDefault();
    setNameError('');
    setNameSaved(false);
    setIsSavingName(true);

    const result = await api.saveName(name);

    setIsSavingName(false);

    if (!result.ok) {
      setNameError(result.error);
      return;
    }

    setNameSaved(true);
  };

  const handleSavePassword = async (event) => {
    event.preventDefault();

    // Checked here first so an obviously short password never leaves the page.
    const foundErrors = {};

    const newPasswordError = checkPassword(newPassword, true);
    if (newPasswordError) {
      foundErrors.newPassword = newPasswordError;
    }

    setPasswordErrors(foundErrors);
    setPasswordSaved(false);

    if (Object.keys(foundErrors).length > 0) {
      return;
    }

    setIsSavingPassword(true);
    const result = await api.changePassword(currentPassword, newPassword);
    setIsSavingPassword(false);

    if (!result.ok) {
      if (result.field) {
        setPasswordErrors({ [result.field]: result.error });
      } else {
        setPasswordErrors({ newPassword: result.error });
      }
      return;
    }

    // Clear the boxes. Leaving a password sitting in a form on screen is a
    // small thing worth not doing.
    setCurrentPassword('');
    setNewPassword('');
    setPasswordSaved(true);
  };

  const handleDeleteAccount = async (event) => {
    event.preventDefault();
    setCloseError('');
    setIsDeleting(true);

    const result = await api.deleteAccount(closePassword, closeConfirmText);

    setIsDeleting(false);

    if (!result.ok) {
      setCloseError(result.error);
      return;
    }

    // The account is gone, so there is nowhere to go but the landing page.
    navigate('/');
  };

  const handleSignOut = async () => {
    await api.logout();
    navigate('/');
  };

  let saveLabel = 'Save name';
  if (isSavingName === true) {
    saveLabel = 'Saving…';
  }

  // household is null until it arrives, so these are worked out defensively.
  let loanAnswer = '—';
  let incomeAnswer = '—';
  let costsAnswer = '—';

  if (household) {
    if (household.hasLoan === true) {
      loanAnswer = 'Yes';
    } else {
      loanAnswer = 'No';
    }

    if (household.incomeVaries === true) {
      incomeAnswer = 'Varies month to month';
    } else {
      incomeAnswer = 'About the same each month';
    }

    // Somebody who onboarded before this question existed has zero stored,
    // which means unanswered rather than "spends nothing".
    if (household.essentialCosts > 0) {
      costsAnswer = formatRupees(household.essentialCosts);
    } else {
      costsAnswer = 'Not set';
    }
  }

  /*
    Somebody who signed up with Google or a phone code has never chosen a
    password, so there is no current one to ask for. They are setting one for
    the first time, and the wording changes to say so.
  */
  const hasPassword = user.hasPassword === true;

  let passwordHeading = 'Set a password';
  let passwordBlurb = 'You sign in with Google or a phone code. Adding a password gives you a second way in.';
  let passwordButton = 'Set password';

  if (hasPassword === true) {
    passwordHeading = 'Change your password';
    passwordBlurb = 'Choose something you have not used anywhere else.';
    passwordButton = 'Change password';
  }

  if (isSavingPassword === true) {
    passwordButton = 'Saving…';
  }

  let deleteButtonLabel = 'Delete my account';
  if (isDeleting === true) {
    deleteButtonLabel = 'Deleting…';
  }

  return (
    <AppShell user={user} title="Settings" subtitle="Your details and your household.">

      <div className="max-w-2xl space-y-6">

        {/* ---------- Name ---------- */}
        <form onSubmit={handleSaveName} noValidate className="rounded-[22px] border border-line bg-surface p-6 shadow-card sm:p-7">
          <h2 className="font-display text-[24px] leading-tight tracking-[-0.01em]">
            What we call you
          </h2>

          <div className="mt-5 max-w-sm">
            <TextField
              id="settings-name"
              label="Your name"
              type="text"
              value={name}
              onChange={setName}
              error={nameError}
              placeholder="Varun Sharma"
              autoComplete="name"
            />
          </div>

          {nameSaved === true ? (
            <p className="mt-4 text-[13.5px] text-accentDeep">Saved.</p>
          ) : null}

          <div className="mt-6">
            <Button type="submit" variant="accent" disabled={isSavingName}>
              {saveLabel}
            </Button>
          </div>
        </form>

        {/* ---------- Household ---------- */}
        <div className="rounded-[22px] border border-line bg-surface p-6 shadow-card sm:p-7">
          <h2 className="font-display text-[24px] leading-tight tracking-[-0.01em]">
            Your household
          </h2>

          <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink2">
            The answers everything else is built from.
          </p>

          {household ? (
            <dl className="mt-6 space-y-3 border-t border-lineSoft pt-5">
              <div className="flex items-baseline justify-between">
                <dt className="text-[14px] text-ink2">Monthly take-home</dt>
                <dd className="tnum text-[15px] font-semibold text-ink">
                  {formatRupees(household.income)}
                </dd>
              </div>

              <div className="flex items-baseline justify-between">
                <dt className="text-[14px] text-ink2">People you support</dt>
                <dd className="tnum text-[15px] font-semibold text-ink">
                  {household.dependents}
                </dd>
              </div>

              <div className="flex items-baseline justify-between">
                <dt className="text-[14px] text-ink2">Repaying a loan</dt>
                <dd className="text-[15px] font-semibold text-ink">{loanAnswer}</dd>
              </div>

              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-[14px] text-ink2">Income pattern</dt>
                <dd className="text-right text-[15px] font-semibold text-ink">{incomeAnswer}</dd>
              </div>

              <div className="flex items-baseline justify-between">
                <dt className="text-[14px] text-ink2">Rent, food and bills</dt>
                <dd className="tnum text-[15px] font-semibold text-ink">{costsAnswer}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-5 text-[14px] text-muted">Loading…</p>
          )}

          <div className="mt-7">
            <Link
              to="/onboarding"
              className="group inline-flex items-center gap-2 rounded-full border border-line bg-surface px-6 py-3.5 text-[14.5px] font-semibold text-ink transition-all duration-300 ease-smooth hover:border-ink hover:shadow-card"
            >
              Change these answers
              <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-0.5">
                &#8594;
              </span>
            </Link>
          </div>
        </div>

        {/* ---------- Password ---------- */}
        <form onSubmit={handleSavePassword} noValidate className="rounded-[22px] border border-line bg-surface p-6 shadow-card sm:p-7">
          <h2 className="font-display text-[24px] leading-tight tracking-[-0.01em]">
            {passwordHeading}
          </h2>

          <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink2">{passwordBlurb}</p>

          <div className="mt-6 max-w-sm space-y-5">
            {/* Only shown when there is a current password to ask for. */}
            {hasPassword === true ? (
              <TextField
                id="current-password"
                label="Current password"
                type="password"
                value={currentPassword}
                onChange={setCurrentPassword}
                error={passwordErrors.currentPassword}
                placeholder="The one you use now"
                autoComplete="current-password"
              />
            ) : null}

            <TextField
              id="new-password"
              label="New password"
              type="password"
              value={newPassword}
              onChange={setNewPassword}
              error={passwordErrors.newPassword}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
          </div>

          {passwordSaved === true ? (
            <p className="mt-4 text-[13.5px] text-accentDeep">
              Saved. Every other browser has been signed out.
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Button type="submit" variant="accent" disabled={isSavingPassword}>
              {passwordButton}
            </Button>

            <p className="text-2xs leading-relaxed text-muted">
              Changing this signs you out everywhere else, but not here.
            </p>
          </div>
        </form>

        {/* ---------- Account ---------- */}
        <div className="rounded-[22px] border border-line bg-surface p-6 shadow-card sm:p-7">
          <h2 className="font-display text-[24px] leading-tight tracking-[-0.01em]">Account</h2>

          <dl className="mt-6 space-y-3 border-t border-lineSoft pt-5">
            {user.email ? (
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-[14px] text-ink2">Email</dt>
                <dd className="text-[15px] font-semibold text-ink">{user.email}</dd>
              </div>
            ) : null}

            {user.phone ? (
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-[14px] text-ink2">Mobile</dt>
                <dd className="tnum text-[15px] font-semibold text-ink">+91 {user.phone}</dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-7 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-full border border-line bg-surface px-6 py-3.5 text-[14.5px] font-semibold text-ink transition-all duration-300 ease-smooth hover:border-ink"
            >
              Sign out
            </button>

            <p className="text-2xs leading-relaxed text-muted">
              Signing out ends this session on the server, not just in this browser.
            </p>
          </div>
        </div>

        {/* ---------- Closing the account ---------- */}
        {/*
          Kept last, in its own colour, and folded shut until asked for. The
          FAQ on the landing page promises people can delete everything, so
          this has to actually do it rather than hide the data away.
        */}
        <div className="rounded-[22px] border border-clay/25 bg-claySoft/40 p-6 sm:p-7">
          <h2 className="font-display text-[24px] leading-tight tracking-[-0.01em] text-clay">
            Close your account
          </h2>

          <p className="mt-2.5 max-w-lg text-[14.5px] leading-relaxed text-ink2">
            This removes your account and everything stored against it: your household,
            your debts, your goals, what you own and every monthly check-in. It cannot be
            undone, and we keep no copy.
          </p>

          {isClosing === false ? (
            <button
              type="button"
              onClick={() => setIsClosing(true)}
              className="mt-6 rounded-full border border-clay/40 px-6 py-3.5 text-[14.5px] font-semibold text-clay transition-all duration-300 ease-smooth hover:border-clay hover:bg-claySoft"
            >
              Delete my account
            </button>
          ) : (
            <form onSubmit={handleDeleteAccount} noValidate className="mt-6 max-w-sm">
              {/*
                Somebody who signed in with Google or a phone code has no
                password for us to check, so they type the word instead. Either
                way there is one deliberate step before anything is destroyed.
              */}
              {hasPassword === true ? (
                <TextField
                  id="close-password"
                  label="Your password"
                  type="password"
                  value={closePassword}
                  onChange={setClosePassword}
                  placeholder="To confirm it is you"
                  autoComplete="current-password"
                />
              ) : (
                <TextField
                  id="close-confirm"
                  label="Type DELETE to confirm"
                  type="text"
                  value={closeConfirmText}
                  onChange={setCloseConfirmText}
                  placeholder="DELETE"
                />
              )}

              {closeError ? (
                <p className="mt-4 text-[13.5px] text-clay">{closeError}</p>
              ) : null}

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={isDeleting}
                  className="rounded-full bg-clay px-6 py-3.5 text-[14.5px] font-semibold text-white transition-all duration-300 ease-smooth hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deleteButtonLabel}
                </button>

                <button
                  type="button"
                  onClick={() => setIsClosing(false)}
                  className="rounded-full border border-line bg-surface px-6 py-3.5 text-[14.5px] font-semibold text-ink transition-all duration-300 ease-smooth hover:border-ink"
                >
                  Keep my account
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-2xs leading-relaxed text-muted">
          Educational guidance, not regulated investment advice. Your answers are stored against
          your account and are never sold or shared.
        </p>
      </div>
    </AppShell>
  );
}
