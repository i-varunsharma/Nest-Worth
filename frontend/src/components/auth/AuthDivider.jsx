/*
  The "or" separator between the Google button and the normal form.

      ---------------- or ----------------

  Two lines with a word between them. flex-1 makes each line take the leftover
  space, so they meet in the middle at any width.
*/
export default function AuthDivider({ text }) {
  let label = 'or';
  if (text) {
    label = text;
  }

  return (
    <div className="flex items-center gap-4">
      <span className="h-px flex-1 bg-line" />
      <span className="text-2xs font-semibold uppercase tracking-widest2 text-muted">
        {label}
      </span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
