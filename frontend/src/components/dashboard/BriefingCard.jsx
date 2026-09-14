import useAsyncData from '../../hooks/useAsyncData';
import * as api from '../../lib/api';

/*
  The daily note at the top of the dashboard: what changed, found by the app's
  own arithmetic and, when a model is configured, written up by it.

  It loads separately from the rest of the dashboard, because the first visit of
  the day waits for the model to write the note. Nothing is drawn when the load
  fails or there is nothing to report: the dashboard is complete without it.
*/
export default function BriefingCard() {
  const loaded = useAsyncData(api.getBriefing);

  if (loaded.data === null) {
    return null;
  }

  const briefing = loaded.data.briefing;

  if (briefing.signals.length === 0) {
    return null;
  }

  // The findings are always the app's own. When a model wrote the paragraph they
  // are listed under it; otherwise the paragraph already is the findings.
  let byline = 'Found by this app\'s own arithmetic';
  let showFindings = false;

  if (briefing.writtenBy !== 'rules') {
    byline = 'Found by this app\'s arithmetic, written up by ' + briefing.writtenBy;
    showFindings = true;
  }

  return (
    <section className="reveal is-in mb-6 rounded-[18px] border border-accent/25 bg-accentSoft p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2.5 text-2xs font-semibold uppercase tracking-widest2 text-accentDeep">
          {/* Two spans: one pulses while the other stays still. */}
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping2 rounded-full bg-accent" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
          </span>
          Noticed since you were last here
        </p>

        <p className="text-2xs text-muted">{byline}</p>
      </div>

      <p className="mt-4 max-w-3xl text-[15.5px] leading-relaxed text-ink">
        {briefing.body}
      </p>

      {showFindings === true ? (
        <ul className="mt-5 space-y-1.5 border-t border-accent/20 pt-4">
          {briefing.signals.map((signal) => {
            return (
              <li key={signal.code} className="text-[12.5px] leading-relaxed text-ink2">
                {signal.fact}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
