import { Link } from 'react-router-dom';
import Card from '../shared/Card';
import Overline from '../shared/Overline';
import StatTile from '../shared/StatTile';
import { bucketAmount, formatRupees } from '../../lib/plan';
import { verdictSentence } from '../../lib/shocks';
import { VERDICT_LOOKS, monthsText } from './shockSettings';

/* The verdict, the four key figures, and what would help, for one shock result. */

/* Suggestions that follow from the numbers, never generic advice. */
function suggestionsFor(result, finances) {
  const suggestions = [];

  if (result.shortfall > 0) {
    let text = 'Build ' + formatRupees(result.shortfall) + ' more in savings or a fixed deposit.';

    if (result.monthsToFix !== null) {
      text = text + ' Your plan saves ' + formatRupees(bucketAmount(finances.plan, 'save'))
        + ' a month, so that takes about ' + monthsText(result.monthsToFix) + '.';
    }

    suggestions.push({ key: 'buffer', text: text, link: '/plans', linkText: 'See the safety net plan' });
  }

  if (result.shock.type === 'medical' && finances.family.withoutCover.length > 0) {
    suggestions.push({
      key: 'cover',
      text: 'Health cover for ' + finances.family.withoutCover[0].name + ' would turn most of this bill into a '
        + 'premium you can plan for.',
      link: '/family',
      linkText: 'Update the family page',
    });
  }

  if (result.shock.type === 'medical' && finances.family.hasList === false) {
    suggestions.push({
      key: 'family',
      text: 'Add the people you support so this test knows who has health cover.',
      link: '/family',
      linkText: 'Add your family',
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      key: 'fine',
      text: 'Nothing to fix for this one. Try making it longer or larger to find where it starts to hurt.',
      link: null,
      linkText: '',
    });
  }

  return suggestions;
}

export default function ShockOutcome({ result, finances }) {
  const looks = VERDICT_LOOKS[result.verdict];

  let lowestNote = 'at month ' + result.lowestMonth;
  if (result.lowestMonth === 0) {
    lowestNote = 'today, it only grows from here';
  }

  let lowestTone = 'ink';
  if (result.lowestCash < 0) {
    lowestTone = 'clay';
  }

  return (
    <div className="space-y-6">
      <div className={'rounded-[26px] border p-6 sm:p-7 ' + looks.box}>
        <p className="flex items-center gap-2.5 text-2xs font-semibold uppercase tracking-widest2 text-ink2">
          <span aria-hidden="true" className={'h-1.5 w-1.5 rounded-full ' + looks.dot} />
          {looks.word}
        </p>
        <p className="mt-4 text-[15.5px] leading-relaxed text-ink">{verdictSentence(result)}</p>
      </div>

      <Card className="grid grid-cols-2 gap-4">
        <StatTile label="Cash today" value={formatRupees(result.startCash, { short: true })} size="md" />
        <StatTile label="Lowest point" value={formatRupees(result.lowestCash, { short: true })} note={lowestNote} size="md" tone={lowestTone} />
        <StatTile label="After a year" value={formatRupees(result.endCash, { short: true })} size="md" />
        <StatTile label="A month costs" value={formatRupees(finances.monthlyCosts, { short: true })} size="md" />
      </Card>

      <Card>
        <Overline>What would help</Overline>

        <ul className="mt-4 space-y-4">
          {suggestionsFor(result, finances).map((suggestion) => {
            return (
              <li key={suggestion.key} className="text-[14px] leading-relaxed text-ink2">
                {suggestion.text}
                {suggestion.link !== null ? (
                  <Link to={suggestion.link} className="sweep ml-1.5 font-semibold text-ink">
                    {suggestion.linkText}
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
