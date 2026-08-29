/*
  Eyebrow
  -------
  The small grey label that sits above a section heading, like:

      ---- THE PROBLEM
      The money leaves before the advice arrives.

  The short line to its left is drawn in CSS, not here. Look for ".eyebrow"
  in src/styles/global.css if you want to change how it looks.
*/
export default function Eyebrow({ children }) {
  return <span className="eyebrow">{children}</span>;
}
