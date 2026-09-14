/*
  The sentence explaining why the plan looks the way it does. buildPlan chooses the
  text and the tone; this only styles it.

  Props:
    reasoning  { tone, label, text }
*/

// Each tone gets a border and a background. The keys match the "tone" that
// buildPlan chose: clay for a warning, brass for a note, accent for good news.
const toneLooks = {
  accent: 'border-accent/25 bg-accentSoft',
  brass: 'border-brass/25 bg-brassSoft',
  clay: 'border-clay/20 bg-claySoft',
};

// A small round badge for each tone, so the card reads at a glance.
const toneBadges = {
  accent: 'bg-accent',
  brass: 'bg-brass',
  clay: 'bg-clay',
};

export default function PriorityCard({ reasoning }) {
  const boxClasses = 'rounded-[26px] border p-6 sm:p-7 ' + toneLooks[reasoning.tone];
  const badgeClasses = 'h-1.5 w-1.5 rounded-full ' + toneBadges[reasoning.tone];

  return (
    <div className={boxClasses}>
      <p className="flex items-center gap-2.5 text-2xs font-semibold uppercase tracking-widest2 text-ink2">
        <span className={badgeClasses} />
        {reasoning.label}
      </p>

      <p className="mt-4 text-[15px] leading-relaxed text-ink2">{reasoning.text}</p>
    </div>
  );
}
