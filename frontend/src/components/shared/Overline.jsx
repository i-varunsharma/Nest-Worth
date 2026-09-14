/*
  The small uppercase label above a figure or a section: "TOTAL OWED".

  className adds to it, for example a margin or a different colour.
*/
export default function Overline({ children, className }) {
  let classes = 'text-2xs font-semibold uppercase tracking-widest2 text-muted';
  if (className) {
    classes = classes + ' ' + className;
  }

  return <p className={classes}>{children}</p>;
}
