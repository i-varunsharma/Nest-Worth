import Overline from './Overline';

/*
  One labelled figure: a small label, a large number, and an optional note.

    <StatTile label="Total owed" value={formatRupees(total)} note="across 3 debts" />

  tone colours the number: 'ink' (default), 'accent' for good, 'clay' for a warning.
  size sets the number's size: 'md' (22px), 'lg' (26px, default) or 'xl' (30px).
  The tile has no border of its own; wrap it in a Card when it stands alone.
*/

const TONE_CLASSES = {
  ink: '',
  accent: 'text-accent',
  clay: 'text-clay',
};

const SIZE_CLASSES = {
  md: 'text-[22px]',
  lg: 'text-[26px]',
  xl: 'text-[30px]',
};

export default function StatTile({ label, value, note, tone, size, className }) {
  let toneClasses = '';
  if (tone && TONE_CLASSES[tone] !== undefined) {
    toneClasses = TONE_CLASSES[tone];
  }

  let sizeClasses = SIZE_CLASSES.lg;
  if (size && SIZE_CLASSES[size]) {
    sizeClasses = SIZE_CLASSES[size];
  }

  return (
    <div className={className}>
      <Overline>{label}</Overline>
      <p className={'tnum mt-1.5 font-display leading-none ' + sizeClasses + ' ' + toneClasses}>{value}</p>
      {note ? <p className="mt-1.5 text-2xs text-muted">{note}</p> : null}
    </div>
  );
}
