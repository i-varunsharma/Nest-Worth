import AppShell from '../components/layout/AppShell';
import AccountSection from '../components/settings/AccountSection';
import CloseAccountSection from '../components/settings/CloseAccountSection';
import HouseholdSection from '../components/settings/HouseholdSection';
import NameSection from '../components/settings/NameSection';
import PasswordSection from '../components/settings/PasswordSection';
import Card from '../components/shared/Card';
import useAsyncData from '../hooks/useAsyncData';
import * as api from '../lib/api';

/* /settings: name, household answers, password and the account itself. */

async function loadHousehold() {
  const result = await api.getHousehold();

  if (result.ok === false) {
    return result;
  }

  return { ok: true, data: result.data.household };
}

export default function SettingsPage({ user }) {
  const household = useAsyncData(loadHousehold);
  const hasPassword = user.hasPassword === true;

  let householdSection = (
    <Card>
      <p className="text-[14px] text-muted">Loading…</p>
    </Card>
  );

  if (household.error) {
    householdSection = (
      <Card>
        <p role="alert" className="text-[14px] text-clay">{household.error}</p>
      </Card>
    );
  } else if (household.data !== null) {
    householdSection = <HouseholdSection household={household.data} />;
  }

  let initialName = '';
  if (user.name) {
    initialName = user.name;
  }

  return (
    <AppShell user={user} title="Settings" subtitle="Your details and your household.">
      <div className="max-w-2xl space-y-6">
        <NameSection initialName={initialName} />
        {householdSection}
        <PasswordSection hasPassword={hasPassword} />
        <AccountSection user={user} />
        <CloseAccountSection hasPassword={hasPassword} />

        <p className="text-2xs leading-relaxed text-muted">
          Educational guidance, not regulated investment advice. Your answers are stored against your account and
          are never sold or shared.
        </p>
      </div>
    </AppShell>
  );
}
