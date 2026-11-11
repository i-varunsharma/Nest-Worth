import Card from './Card';
import CountUp from './CountUp';
import Overline from './Overline';
import { formatRupeesShort } from '../../lib/format';

/*
  A card with a label, a rupee amount that counts up, and a short note.

    <MoneyFigure label="Spent" amount={42000} note="212 lines read" />
    <MoneyFigure label="Kept" amount={-3000} note="..." isNegative={true} size="section" tone="ink" />

  Used by the spending month and the year recap, which had their own copies of
  this before.

  size        'tile' (default, smaller) or 'section' (bigger, for the recap)
  tone        colour of a normal amount: 'accent' (default) or 'ink'
  isNegative  true turns the amount red (clay), whatever the tone
*/

const SIZES = {
  tile: { card: 'tile', number: 'mt-2.5 text-[26px]', note: 'mt-2 text-2xs text-muted' },
  section: { card: 'section', number: 'mt-3 text-[30px]', note: 'mt-2.5 text-2xs leading-relaxed text-muted' },
};

const TONES = {
  accent: 'text-accent',
  ink: 'text-ink',
};

export default function MoneyFigure({ label, amount, note, isNegative, size, tone }) {
  let sizeClasses = SIZES.tile;
  if (size === 'section') {
    sizeClasses = SIZES.section;
  }

  let valueColour = TONES.accent;
  if (tone === 'ink') {
    valueColour = TONES.ink;
  }
  if (isNegative === true) {
    valueColour = 'text-clay';
  }

  return (
    <Card size={sizeClasses.card}>
      <Overline>{label}</Overline>
      <p className={'tnum font-display leading-none ' + sizeClasses.number + ' ' + valueColour}>
        <CountUp to={amount} format={formatRupeesShort} />
      </p>
      <p className={sizeClasses.note}>{note}</p>
    </Card>
  );
}
