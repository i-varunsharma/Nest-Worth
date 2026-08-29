/*
  AuthDivider
  -----------
  The little "or" separator between the Google button and the normal form.

      ---------------- or ----------------

  It is two flexible lines with a word between them. "flex-1" tells each line to
  take up whatever space is left over, so they always meet in the middle no
  matter how wide the form is.
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
