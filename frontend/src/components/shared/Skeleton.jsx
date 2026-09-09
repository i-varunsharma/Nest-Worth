/*
  A grey placeholder in the shape of the thing that has not arrived yet.

  Why bother, when a "Loading…" line is two words and works? Because the word
  sits in the middle of an empty screen and then the real page appears around
  it, so everything jumps. A skeleton is the same size and in the same place as
  what replaces it, so nothing moves when the answer comes back. It also makes
  the wait feel shorter, because the reader can already see the shape of what
  they are getting.

  The moving shimmer is the ".skeleton" class in global.css.

  Props:
    className - the size, as Tailwind classes. Always give it a height.
*/
export function Skeleton({ className }) {
  let classes = 'skeleton ';

  if (className) {
    classes = classes + className;
  }

  // aria-hidden keeps it out of screen readers. There is nothing here to read
  // out, and announcing a row of empty boxes would be worse than silence. The
  // page announces the wait itself, with the aria-busy region below.
  return <div className={classes} aria-hidden="true" />;
}

/*
  One of the four cards across the top of a page: a small label, a big number,
  a caption. Drawn hollow while the real numbers are being fetched.
*/
export function SkeletonStat() {
  return (
    <div className="rounded-[18px] border border-line bg-surface p-5 shadow-card">
      <Skeleton className="h-2.5 w-16" />
      <Skeleton className="mt-4 h-7 w-28" />
      <Skeleton className="mt-3 h-2.5 w-20" />
    </div>
  );
}

/*
  A card-shaped block, for the bigger panels lower down a page.

  Props:
    className - usually just a height, since the grid decides the width.
*/
export function SkeletonCard({ className }) {
  let classes = 'rounded-[18px] border border-line bg-surface p-6 shadow-card ';

  if (className) {
    classes = classes + className;
  }

  return (
    <div className={classes}>
      <Skeleton className="h-2.5 w-24" />
      <Skeleton className="mt-5 h-5 w-3/4" />
      <Skeleton className="mt-3 h-5 w-1/2" />
      <Skeleton className="mt-8 h-24 w-full" />
    </div>
  );
}

/*
  The wrapper to put a whole loading screen in.

  aria-busy tells a screen reader the region is still filling in, and the
  visually hidden sentence is what actually gets read out. "sr-only" is a
  Tailwind class that hides something from the eye but not from a reader.

  Props:
    label    - what is being waited for, read out to screen readers
    children - the skeleton shapes
*/
export function SkeletonScreen({ label, children }) {
  return (
    <div aria-busy="true">
      <p className="sr-only">{label}</p>
      {children}
    </div>
  );
}

/*
  A whole page's worth of shapes: a row of small stat cards, then some bigger
  panels. Four pages wait on their own list of things and all four look roughly
  like this, so they share one loading screen rather than writing four.

  Props:
    label - what is being waited for, read out to screen readers
    stats - how many small cards across the top
    cards - how many big panels below them
*/
export function SkeletonPage({ label, stats, cards }) {
  // Build the two lists as arrays of numbers first. A map needs something to
  // map over, and "draw this three times" is not a thing JSX can say on its own.
  const statBoxes = [];
  for (let index = 0; index < stats; index = index + 1) {
    statBoxes.push(index);
  }

  const cardBoxes = [];
  for (let index = 0; index < cards; index = index + 1) {
    cardBoxes.push(index);
  }

  return (
    <SkeletonScreen label={label}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statBoxes.map((index) => {
          return <SkeletonStat key={index} />;
        })}
      </div>

      <div className="mt-6 space-y-6">
        {cardBoxes.map((index) => {
          return <SkeletonCard key={index} />;
        })}
      </div>
    </SkeletonScreen>
  );
}

export default Skeleton;
