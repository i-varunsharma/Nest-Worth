import { Link } from 'react-router-dom';

const base = 'group inline-flex items-center justify-center gap-2 rounded-full text-[14.5px] font-semibold transition-all duration-300 ease-smooth';

const variants = {
  primary: 'bg-ink text-paper px-6 py-3.5 shadow-card hover:bg-accent hover:shadow-lift hover:-translate-y-0.5',
  accent: 'bg-accent text-white px-6 py-3.5 shadow-card hover:bg-accentDeep hover:shadow-lift hover:-translate-y-0.5',
  outline: 'border border-line bg-surface/60 text-ink px-6 py-3.5 hover:border-ink hover:bg-surface hover:-translate-y-0.5',
  ghostDark: 'border border-white/15 text-paper px-6 py-3.5 hover:border-white/40 hover:bg-white/5 hover:-translate-y-0.5',
  lightOnDark: 'bg-paper text-ink px-6 py-3.5 hover:bg-white hover:-translate-y-0.5 hover:shadow-float',
  small: 'bg-ink text-paper px-5 py-2.5 text-[13.5px] hover:bg-accent',
};

export default function Button({ to, href, variant = 'primary', arrow = false, className = '', children, ...rest }) {
  const classes = `${base} ${variants[variant] ?? variants.primary} ${className}`;
  const inner = (
    <>
      {children}
      {arrow && (
        <span aria-hidden="true" className="transition-transform duration-300 ease-smooth group-hover:translate-x-1">
          &#8594;
        </span>
      )}
    </>
  );

  if (to) return <Link to={to} className={classes} {...rest}>{inner}</Link>;
  return <a href={href ?? '#'} className={classes} {...rest}>{inner}</a>;
}
