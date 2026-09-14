import { useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import { PageError, PageLoading } from '../components/layout/PageStatus';
import RecapYear from '../components/recap/RecapYear';
import Card from '../components/shared/Card';
import PillGroup from '../components/shared/PillGroup';
import useAsyncData from '../hooks/useAsyncData';
import * as api from '../lib/api';

/*
  /recap: a year of bank statements, looked back on. A plan is easy to abandon
  in month three; seeing that the months so far added up to something is what
  keeps people going.
*/

const TITLE = 'Your year';

export default function RecapPage({ user }) {
  const years = useAsyncData(api.getRecapYears);

  // The year somebody picked. Empty means the newest.
  const [pickedYear, setPickedYear] = useState('');

  if (years.error) {
    return <PageError user={user} title={TITLE} message={years.error} />;
  }

  if (years.data === null) {
    return <PageLoading user={user} title={TITLE} label="Looking back over the year" stats={3} cards={2} />;
  }

  const yearList = years.data.years;

  if (yearList.length === 0) {
    return (
      <AppShell user={user} title="Your year." subtitle="Nothing to look back on yet.">
        <Card size="section" className="p-8">
          <p className="max-w-lg text-[15.5px] leading-relaxed text-ink2">
            This page is built from your bank statements rather than from anything you type, so it needs at
            least one month imported before it has something to say.
          </p>

          <Link
            to="/spending"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[13.5px] font-semibold text-paper transition-all duration-300 ease-smooth hover:bg-accent"
          >
            Import a month
            <span aria-hidden="true">&#8594;</span>
          </Link>
        </Card>
      </AppShell>
    );
  }

  let year = yearList[0].year;

  for (const entry of yearList) {
    if (entry.year === pickedYear) {
      year = pickedYear;
    }
  }

  // A picker with one option would be a button that does nothing.
  let yearPicker = null;

  if (yearList.length > 1) {
    const options = yearList.map((entry) => {
      return { key: entry.year, label: entry.year };
    });

    yearPicker = <PillGroup options={options} selectedKey={year} onSelect={setPickedYear} />;
  }

  return (
    <AppShell user={user} title={year + '.'} subtitle="Your bank statements for the year, read line by line." action={yearPicker}>
      <RecapYear year={year} />
    </AppShell>
  );
}
