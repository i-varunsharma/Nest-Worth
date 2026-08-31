import { Link } from 'react-router-dom';

/*
  One component for every button on the site, so they all look like family.

  It can render three different things depending on what you pass in:

    <Button to="/signup">Sign up</Button>       -> a link to another page in our app
    <Button href="#how">See how</Button>        -> a link that jumps down the page
    <Button onClick={save}>Save</Button>        -> a real button that runs code

  The "variant" prop chooses the colour scheme. The options are listed in the
  buttonStyles object below, so you can see them all in one place.
*/

// The classes every button shares, no matter which variant it uses.
const sharedStyles =
  'group inline-flex items-center justify-center gap-2 rounded-full '
  + 'text-[14.5px] font-semibold transition-all duration-300 ease-smooth';

// The classes that change from one variant to the next.
const buttonStyles = {
  // Dark button, turns green when you hover it. Our normal choice.
  primary: 'bg-ink text-paper px-6 py-3.5 shadow-card hover:bg-accent hover:shadow-lift hover:-translate-y-0.5',

  // Green button, for the single most important action on a screen.
  accent: 'bg-accent text-white px-6 py-3.5 shadow-card hover:bg-accentDeep hover:shadow-lift hover:-translate-y-0.5',

  // Outlined button, for the quieter second option next to a primary one.
  outline: 'border border-line bg-surface/60 text-ink px-6 py-3.5 hover:border-ink hover:bg-surface hover:-translate-y-0.5',

  // The two below are only used on the dark sections, where the page is nearly black.
  lightOnDark: 'bg-paper text-ink px-6 py-3.5 hover:bg-white hover:-translate-y-0.5 hover:shadow-float',
  ghostOnDark: 'border border-white/15 text-paper px-6 py-3.5 hover:border-white/40 hover:bg-white/5 hover:-translate-y-0.5',
};

export default function Button({ children, to, href, onClick, variant, arrow, type, className, disabled }) {
  // Pick the colour scheme. If nobody chose one, use the primary style.
  let variantStyles = buttonStyles.primary;
  if (variant && buttonStyles[variant]) {
    variantStyles = buttonStyles[variant];
  }

  let allClasses = sharedStyles + ' ' + variantStyles;
  if (className) {
    allClasses = allClasses + ' ' + className;
  }

  // A button that is busy or unusable should look it, and should ignore clicks.
  if (disabled === true) {
    allClasses = allClasses + ' cursor-not-allowed opacity-50';
  }

  // Some buttons show a small arrow that slides right when you hover them.
  let arrowElement = null;
  if (arrow === true) {
    arrowElement = (
      <span
        aria-hidden="true"
        className="transition-transform duration-300 ease-smooth group-hover:translate-x-1"
      >
        &#8594;
      </span>
    );
  }

  // Case 1: it moves to another page inside our app, so use the router's Link.
  if (to) {
    return (
      <Link to={to} className={allClasses}>
        {children}
        {arrowElement}
      </Link>
    );
  }

  // Case 2: it is a plain link, usually jumping to a section further down.
  if (href) {
    return (
      <a href={href} className={allClasses}>
        {children}
        {arrowElement}
      </a>
    );
  }

  // Case 3: it is a real button that runs some code when clicked.
  // "type" matters inside forms: "submit" sends the form, "button" does not.
  let buttonType = 'button';
  if (type) {
    buttonType = type;
  }

  return (
    <button type={buttonType} onClick={onClick} disabled={disabled} className={allClasses}>
      {children}
      {arrowElement}
    </button>
  );
}
