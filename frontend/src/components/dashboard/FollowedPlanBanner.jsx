import { Link } from 'react-router-dom';

/*
  Shown when a plan was chosen on /plans, so the dashboard never shows different
  numbers from the recommendation without saying why.
*/
export default function FollowedPlanBanner({ scenario }) {
  if (!scenario) {
    return null;
  }

  return (
    <Link
      to="/plans"
      className="group mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-accent/25 bg-accentSoft px-5 py-4 transition-colors duration-300 hover:border-accent/50"
    >
      <p className="text-[14px] leading-relaxed text-ink2">
        <span className="font-semibold text-accentDeep">Following: {scenario.name}.</span> {scenario.idea}
      </p>

      <span className="shrink-0 text-2xs font-semibold uppercase tracking-widest2 text-accentDeep">
        Change
        <span aria-hidden="true" className="ml-1.5 inline-block transition-transform duration-300 group-hover:translate-x-0.5">
          &#8594;
        </span>
      </span>
    </Link>
  );
}
