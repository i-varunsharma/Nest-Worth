/*
  The bordered white box used for almost every section of the signed-in app.

    <Card>...</Card>
    <Card as="form" size="panel" onSubmit={handleSubmit}>...</Card>

  size picks the corner radius and padding:
    tile     small figures, such as a stat in a row of four
    section  a full-width block on the spending and recap pages
    card     the usual section
    panel    the large headline sections

  Any other props, such as onSubmit, id or ref, are passed to the element.
*/

const SIZE_CLASSES = {
  tile: 'rounded-[18px] p-5',
  section: 'rounded-[18px] p-6',
  card: 'rounded-[22px] p-6 sm:p-7',
  panel: 'rounded-[26px] p-6 sm:p-8',
};

export default function Card({ as, size, className, children, ...elementProps }) {
  // "as" lets the same look be a <form> or an <article>. A capitalised
  // variable is how JSX renders a tag chosen at runtime.
  let Element = 'div';
  if (as) {
    Element = as;
  }

  let sizeClasses = SIZE_CLASSES.card;
  if (size && SIZE_CLASSES[size]) {
    sizeClasses = SIZE_CLASSES[size];
  }

  let classes = 'border border-line bg-surface shadow-card ' + sizeClasses;
  if (className) {
    classes = classes + ' ' + className;
  }

  return (
    <Element className={classes} {...elementProps}>
      {children}
    </Element>
  );
}
