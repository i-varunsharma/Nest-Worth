import { useEffect, useState } from 'react';
import * as api from '../../lib/api';

/*
  The note at the top of the dashboard that nobody asked for.

  The coach card below answers questions. This is the other half: it looks at
  the account on its own and says the two or three things worth being told. A
  month where the food spend doubled is not a question anybody thinks to type.

  It is fetched separately from the rest of the dashboard rather than alongside
  it. On the first visit of a day the note has to be written, which means
  waiting for a language model, and putting that in with the other five requests
  would hold the whole page back for a card that is not the main thing on it.
  This way the dashboard draws immediately and the note slides in behind it.

  Nothing is drawn when there is nothing to report. A card that appears every
  day saying "nothing has changed" is a card people stop seeing, and then it is
  no use on the day something has.
*/
export default function BriefingCard() {
  const [briefing, setBriefing] = useState(null);

  useEffect(() => {
    let stillMounted = true;

    const load = async () => {
      const response = await api.getBriefing();

      if (stillMounted === false) {
        return;
      }

      // A failure here is not worth reporting. The dashboard is complete
      // without this card, and an error message where a helpful note should be
      // is worse than no card at all.
      if (response.ok === false) {
        return;
      }

      setBriefing(response.data.briefing);
    };

    load();

    return () => {
      stillMounted = false;
    };
  }, []);

  if (briefing === null) {
    return null;
  }

  if (briefing.signals.length === 0) {
    return null;
  }

  /*
    Who did the wording, and whether the findings need showing separately.

    These two go together. The findings are always this app's own arithmetic;
    only the sentences are ever a model's. When no model is configured the
    paragraph IS the list of findings, so printing both would be the same words
    twice, which reads as a bug rather than as evidence.
  */
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
          {/* The small dot with a ring expanding out of it. Two spans, because
              one of them has to keep pulsing while the other stays put. */}
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

      {/*
        The findings the paragraph was written from.

        Shown because a claim about somebody's money should come with the
        arithmetic behind it, and because "where did it get that from" is a fair
        question to ask of a computer that volunteers an opinion about your
        spending. Hidden when no model was involved, since then the paragraph
        above is already these same sentences.
      */}
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
