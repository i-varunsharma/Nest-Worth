import useReveal from '../../hooks/useReveal';
import { categoryLabel } from '../../lib/categories';
import { formatRupees } from '../../lib/plan';

/*
  A month's spending by category as sorted bars.

  Bars rather than a pie, because lengths on a shared baseline are easy to compare
  and angles are not, especially across twelve categories. One colour, because
  each bar is already labelled.

  Props:
    categories  [{ key, total, share }], sorted by the server
*/

// A bar this short is a sliver nobody can see, so it is given a floor. The
// number beside it is still the truth; this only stops the mark vanishing.
const MINIMUM_BAR_WIDTH = 1.5;

export default function CategoryBars({ categories }) {
  // The bars grow from zero once they are scrolled into view.
  const [listRef, isVisible] = useReveal();

  if (categories.length === 0) {
    return (
      <p className="text-[14px] text-muted">
        Nothing was spent in this month, which usually means the statement only
        covered transfers and salary.
      </p>
    );
  }

  return (
    <ul ref={listRef} className="space-y-3.5">
      {categories.map((entry) => {
        // Worked out before the markup rather than inside it, so each line
        // below is one readable thing.
        let width = entry.share;

        if (width < MINIMUM_BAR_WIDTH) {
          width = MINIMUM_BAR_WIDTH;
        }

        // Held at nothing until the card has been scrolled to, then released.
        let drawnWidth = '0%';

        if (isVisible === true) {
          drawnWidth = width + '%';
        }

        return (
          <li key={entry.key}>
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-[13.5px] font-medium text-ink2">
                {categoryLabel(entry.key)}
              </span>

              <span className="tnum shrink-0 text-[13.5px] font-semibold text-ink">
                {formatRupees(entry.total)}
                <span className="ml-2 font-normal text-muted">
                  {Math.round(entry.share)}%
                </span>
              </span>
            </div>

            {/* The track is the full width; the bar inside it is the share. */}
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-lineSoft">
              <div
                className="h-full rounded-full transition-[width] duration-700 ease-smooth"
                style={{ width: drawnWidth, backgroundColor: 'var(--chart-spend)' }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
