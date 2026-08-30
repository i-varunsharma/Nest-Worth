import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppShell from '../components/app/AppShell';
import Button from '../components/shared/Button';
import TextField from '../components/shared/TextField';
import * as api from '../lib/api';
import { formatRupees } from '../lib/plan';

/*
  SettingsPage
  ------------
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

  useEffect(() => {
    api.getHousehold().then((result) => {
      if (result.ok) {
        setHousehold(result.data.household);
      }
    });
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

  const handleSignOut = async () => {
    await api.logout();
    navigate('/');
  };

  let saveLabel = 'Save name';
  if (isSavingName === true) {
    saveLabel = 'Saving…';
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
            The three answers everything else is built from.
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

        <p className="text-2xs leading-relaxed text-muted">
          Educational guidance, not regulated investment advice. Your answers are stored against
          your account and are never sold or shared.
        </p>
      </div>
    </AppShell>
  );
}
