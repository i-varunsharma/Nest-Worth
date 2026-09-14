/*
  A grey placeholder the same size and place as what is loading, so nothing jumps
  when the data arrives. The shimmer is the .skeleton class in global.css.

  Props:
    className  the size as Tailwind classes; always include a height
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

// A placeholder for a small stat card.
export function SkeletonStat() {
  return (
    <div className="rounded-[18px] border border-line bg-surface p-5 shadow-card">
      <Skeleton className="h-2.5 w-16" />
      <Skeleton className="mt-4 h-7 w-28" />
      <Skeleton className="mt-3 h-2.5 w-20" />
    </div>
  );
}

// A placeholder for a larger panel. className is usually just a height.
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

// Wraps a loading screen. aria-busy and the hidden label tell screen readers
// what is being waited for.
export function SkeletonScreen({ label, children }) {
  return (
    <div aria-busy="true">
      <p className="sr-only">{label}</p>
      {children}
    </div>
  );
}

/*
  A whole page of placeholders: stat cards across the top, panels below.

  Props:
    label  read out to screen readers
    stats  how many small cards
    cards  how many panels
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
