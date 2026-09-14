import { Link } from 'react-router-dom';

/* The button beside the dashboard heading: record this month, or it is already recorded. */
export default function CheckInLink({ hasCheckedIn }) {
  let label = 'Check in for this month';
  let colours = 'border-line bg-surface text-ink hover:border-ink hover:shadow-card';

  if (hasCheckedIn === true) {
    label = 'This month is recorded';
    colours = 'border-accent/30 bg-accentSoft text-accentDeep hover:border-accent';
  }

  return (
    <Link
      to="/check-in"
      className={'group inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-[13.5px] font-semibold transition-all duration-300 ease-smooth ' + colours}
    >
      {label}
      <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-0.5">
        &#8594;
      </span>
    </Link>
  );
}
