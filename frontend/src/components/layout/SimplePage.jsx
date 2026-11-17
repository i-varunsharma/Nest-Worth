import SiteHeader from './SiteHeader';

/*
  The frame for plain reading pages: privacy, terms and not found.
  One narrow column, so long text stays easy to read.

  Props:
    title     the main heading
    updated   optional "last updated" line under the heading
    children  the page's text
*/
export default function SimplePage({ title, updated, children }) {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <SiteHeader />

      <main className="flex-1 px-6 py-14 sm:px-8">
        <article className="mx-auto w-full max-w-[680px]">
          <h1 className="font-display text-[clamp(2.1rem,5vw,3rem)] leading-[1.08] tracking-[-0.02em]">
            {title}
          </h1>

          {updated && <p className="mt-3 text-[13px] text-muted">{updated}</p>}

          <div className="mt-10 space-y-5 text-[15px] leading-relaxed text-ink2">
            {children}
          </div>
        </article>
      </main>

      <footer className="border-t border-line px-6 py-5">
        <p className="mx-auto max-w-[1180px] text-2xs text-muted">
          Educational guidance, not regulated investment advice.
        </p>
      </footer>
    </div>
  );
}
