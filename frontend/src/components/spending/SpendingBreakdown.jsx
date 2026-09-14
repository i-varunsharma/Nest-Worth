import { Link } from 'react-router-dom';
import CategoryBars from '../charts/CategoryBars';
import Card from '../shared/Card';
import Overline from '../shared/Overline';
import useReveal from '../../hooks/useReveal';

/*
  Spending by category for one month, with a link that opens the check-in page
  with this month's figures filled in. Rounded to whole rupees, because a
  check-in is a rough record.
*/

function checkInLinkFor(summary) {
  return '/check-in?month=' + summary.month
    + '&income=' + Math.round(summary.income)
    + '&spent=' + Math.round(summary.spent)
    + '&invested=' + Math.round(summary.putAway);
}

function attentionNoteFor(count) {
  if (count === 0) {
    return '';
  }

  if (count === 1) {
    return 'One line could not be matched to a merchant and is sitting in "everything else". Setting it '
      + 'below moves it into the right bar.';
  }

  return count + ' lines could not be matched to a merchant and are sitting in "everything else". Setting '
    + 'them below moves them into the right bar.';
}

export default function SpendingBreakdown({ summary }) {
  // The bars grow when the card first scrolls into view.
  const [chartRef, isChartVisible] = useReveal();
  const attentionNote = attentionNoteFor(summary.needingAttention);

  return (
    <Card ref={chartRef} size="section" className="mt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <Overline>Where it went</Overline>
        <Link to={checkInLinkFor(summary)} className="sweep text-[13px] font-medium text-muted transition-colors hover:text-ink">
          Record this month &#8594;
        </Link>
      </div>

      <div className="mt-6">
        <CategoryBars categories={summary.categories} isVisible={isChartVisible} />
      </div>

      {attentionNote !== '' ? (
        <p className="mt-6 border-t border-lineSoft pt-4 text-[13px] leading-relaxed text-muted">{attentionNote}</p>
      ) : null}
    </Card>
  );
}
