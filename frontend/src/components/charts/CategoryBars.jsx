import useReveal from '../../hooks/useReveal';
import { categoryLabel } from '../../lib/categories';
import { formatRupees } from '../../lib/plan';

/*
  Where a month's spending went, as a sorted row of bars.

  Why bars and not a pie. The question this answers is "which of these is
  biggest, and by how much", and length along a shared baseline is the one thing
  the eye compares accurately. Angles are not: two slices within a few percent
  of each other are genuinely indistinguishable in a pie, and there are twelve
  categories here, which is far past the three or four a pie can carry.

  Why they are all one colour. Twelve hues would be a rainbow that means
  nothing, and the reader would spend the whole time looking things up in a
  legend. The category is already written next to its own bar, so colour has no
  work left to do, and giving one bar a different colour would say it mattered
  more than the others when it only means it is bigger.

  Props:
    categories - [{ key, total, share }], already sorted by the server
*/

// A bar this short is a sliver nobody can see, so it is given a floor. The
// number beside it is still the truth; this only stops the mark vanishing.
const MINIMUM_BAR_WIDTH = 1.5;

export default function CategoryBars({ categories }) {
  /*
    The bars start at nothing and grow to their share once the list has been
    scrolled to. The hook is called in here rather than by the page, because it
    watches an element and can only do that once the element exists. This
    component is not drawn until the numbers have arrived, so by the time the
    hook runs there is something on the page to watch.
  */
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
