/*
  A short coloured message, usually under a form.

    <Notice tone="error">That EMI does not look right.</Notice>
    <Notice tone="success">Saved.</Notice>

  Nothing is drawn when there are no children, so it can be left in place:
    <Notice tone="error">{error}</Notice>
*/

const TONE_CLASSES = {
  error: 'border-clay/25 bg-claySoft text-clay',
  success: 'border-accent/25 bg-accentSoft text-accentDeep',
  info: 'border-line bg-paperDeep text-ink2',
};

export default function Notice({ tone, children, className }) {
  if (!children) {
    return null;
  }

  let toneClasses = TONE_CLASSES.info;
  if (tone && TONE_CLASSES[tone]) {
    toneClasses = TONE_CLASSES[tone];
  }

  let classes = 'rounded-xl border px-4 py-3 text-[13.5px] leading-relaxed ' + toneClasses;
  if (className) {
    classes = classes + ' ' + className;
  }

  // role="alert" makes a screen reader announce an error as soon as it appears.
  let role;
  if (tone === 'error') {
    role = 'alert';
  }

  return <p role={role} className={classes}>{children}</p>;
}
