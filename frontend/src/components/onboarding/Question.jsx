/* The heading, the explanation and the footnote shared by every onboarding question. */
export default function Question({ title, intro, footnote, children }) {
  return (
    <div>
      <h2 className="font-display text-[clamp(1.9rem,3.5vw,2.6rem)] leading-[1.08] tracking-[-0.02em]">{title}</h2>
      <p className="mt-4 max-w-md text-[15.5px] leading-relaxed text-ink2">{intro}</p>

      <div className="mt-10">{children}</div>

      {footnote ? <p className="mt-5 text-[13px] text-muted">{footnote}</p> : null}
    </div>
  );
}
