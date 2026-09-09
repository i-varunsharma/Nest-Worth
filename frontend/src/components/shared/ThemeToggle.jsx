import useTheme from '../../hooks/useTheme';

/*
  The little sun/moon button in the top bar.

  Both icons are drawn in the same box, one on top of the other, and the switch
  fades and rotates between them rather than swapping one element for another.
  Swapping would be simpler, but it snaps, and a control that snaps feels
  cheap on a page where everything else eases.
*/
export default function ThemeToggle({ className }) {
  const [theme, toggleTheme] = useTheme();

  const isDark = theme === 'dark';

  // What the button will do next, not what the theme is now. A screen reader
  // reads out the action, so "switch to light theme" is the useful sentence.
  let label = 'Switch to dark theme';
  if (isDark === true) {
    label = 'Switch to light theme';
  }

  // Each icon is either in place or rotated away and invisible. Worked out here
  // so the markup below stays readable.
  let sunClasses = 'absolute inset-0 grid place-items-center transition-all duration-500 ease-smooth ';
  let moonClasses = 'absolute inset-0 grid place-items-center transition-all duration-500 ease-smooth ';

  if (isDark === true) {
    sunClasses = sunClasses + 'rotate-90 scale-50 opacity-0';
    moonClasses = moonClasses + 'rotate-0 scale-100 opacity-100';
  } else {
    sunClasses = sunClasses + 'rotate-0 scale-100 opacity-100';
    moonClasses = moonClasses + '-rotate-90 scale-50 opacity-0';
  }

  let buttonClasses = 'relative grid h-9 w-9 shrink-0 place-items-center rounded-full '
    + 'border border-line text-ink transition-colors duration-300 hover:border-ink ';

  if (className) {
    buttonClasses = buttonClasses + className;
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={buttonClasses}
    >
      {/* The sun. */}
      <span className={sunClasses} aria-hidden="true">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.4v2.2M12 19.4v2.2M2.4 12h2.2M19.4 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6" />
        </svg>
      </span>

      {/* The moon. One circle with a second circle bitten out of it, which is
          what the single curved path below draws. */}
      <span className={moonClasses} aria-hidden="true">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5a8.6 8.6 0 1 0 11.1 11.1Z" />
        </svg>
      </span>
    </button>
  );
}
