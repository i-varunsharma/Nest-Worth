/*
  The small grey label above a section heading:

      ---- THE PROBLEM
      The money leaves before the advice arrives.

  The short line to its left is drawn by the ".eyebrow" class in
  src/styles/global.css.
*/
export default function Eyebrow({ children }) {
  return <span className="eyebrow">{children}</span>;
}
