import db from '../database/db.js';
import { chooseProvider } from './ai/index.js';
import { findSignals, latestImportedMonth } from './signals.js';

/*
  The note on the dashboard that nobody asked for.

  The coach card answers questions. This does the other half: it looks at the
  account on its own and says the two or three things somebody would want to be
  told. That is the difference between a tool you have to interrogate and one
  that tells you when something moved.

  The work is split in two, and the split is the whole design.

    lib/signals.js finds what is true. Every finding is a query with a number
    attached, so it either happened or it did not, and the same data gives the
    same findings every time.

    this file turns those findings into sentences. That is the only job the
    model has, and it is the one it is actually good at.

  A model asked to do both would decide what is true and how to say it at the
  same time, so a misread and a well-written sentence would arrive together and
  look identical. It would also say something different on every run against
  the same account, which cannot be tested.
*/

// Three is what fits on a card and what somebody will actually read. A list of
// nine things to think about is a list nobody acts on.
const MOST_SIGNALS_TO_USE = 3;

// The note is kept short by the prompt, not by this number. The limit also
// covers the model's thinking, and at 300 the note was cut off mid-word.
const MAX_TOKENS = 1500;

const SYSTEM_PROMPT = [
  'You write a short daily note for somebody using a personal finance app in India.',
  '',
  'You will be given findings. Each one is already true and already checked. Write',
  'them up as at most three short sentences, in the order given.',
  '',
  'Rules:',
  '- Use only the findings. Never add a number that is not in them, and never',
  '  work out a new one.',
  '- Amounts are in rupees. Write them as ₹24,000 in the Indian style.',
  '- Plain words. No greeting, no sign-off, no bullet points, no headings.',
  '- Say what happened and why it matters. Do not tell anybody off.',
  '- If a finding is good news, say so.',
  '- Never promise a return or recommend a specific fund, stock or product.',
].join('\n');


/*
  Turns findings into sentences.

  Falls back to the findings themselves when there is no model configured or the
  call fails. That fallback is not a stopgap: the facts are already written as
  plain sentences in signals.js precisely so that the app has something true to
  show when the AI is unavailable. An empty card would be worse, and a card that
  says "the AI is down" is worse still, because it makes the model sound like
  the point when it is only the wording.
*/
export async function writeBriefing(signals) {
  const chosen = signals.slice(0, MOST_SIGNALS_TO_USE);

  if (chosen.length === 0) {
    return {
      body: 'Nothing has moved much since the last look. That is usually the '
        + 'right thing for a plan to be doing.',
      writtenBy: 'rules',
    };
  }

  const provider = chooseProvider();

  if (provider === null) {
    return { body: plainVersion(chosen), writtenBy: 'rules' };
  }

  const findings = chosen.map((signal) => {
    return '- ' + signal.fact;
  }).join('\n');

  try {
    const round = await provider.run({
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', text: 'Findings:\n' + findings }],

      // No tools. Everything the model needs is in the message, and giving it
      // the ability to go and look would let it find a number nobody checked.
      tools: [],
      maxTokens: MAX_TOKENS,
    });

    const text = String(round.text).trim();

    if (text.length === 0) {
      return { body: plainVersion(chosen), writtenBy: 'rules' };
    }

    return { body: text, writtenBy: provider.name };
  } catch (error) {
    // A model being unavailable is not a reason for the dashboard to break. The
    // findings are true either way.
    console.error('Briefing could not be written by the model:', error.message);

    return { body: plainVersion(chosen), writtenBy: 'rules' };
  }
}


/*
  The findings as they are, joined up.

  They need no rewriting because signals.js already writes each one as a whole
  sentence with its amounts formatted. That is deliberate: the version somebody
  sees when no model is configured should not be the rough draft.
*/
function plainVersion(signals) {
  return signals.map((signal) => {
    return signal.fact;
  }).join(' ');
}


/*
  Today's note for one person, written if it does not exist yet.

  Once a day, not once a page load. Writing it costs a call to a model, and a
  note whose wording changed every time the dashboard was refreshed would read
  as noise rather than as something that had been noticed.

  It is written when somebody first opens the dashboard that day rather than by
  a job running overnight. At this size that is the honest trade: a nightly job
  would have to wake up and write a note for every account whether or not
  anybody was going to read it, and would need something to run it. The cost of
  doing it this way is that the very first dashboard load of the day waits for
  the model.
*/
export async function briefingForToday(userId) {
  const today = new Date().toISOString().slice(0, 10);

  const existing = db.prepare(`
    SELECT * FROM briefings WHERE user_id = ? AND made_on = ?
  `).get(userId, today);

  if (existing) {
    return {
      body: existing.body,
      signals: JSON.parse(existing.signals),
      writtenBy: existing.written_by,
      madeOn: existing.made_on,
      isNew: false,
    };
  }

  const month = latestImportedMonth(userId);
  const signals = findSignals(userId, month);

  const written = await writeBriefing(signals);

  /*
    INSERT OR IGNORE rather than a plain INSERT.

    Two tabs opening the dashboard at the same moment both find no row and both
    try to write one. The UNIQUE (user_id, made_on) index refuses the second,
    and OR IGNORE turns that refusal into a no-op instead of a 500. Whichever
    note landed first is the one everybody sees, and they were written from the
    same findings anyway.
  */
  db.prepare(`
    INSERT OR IGNORE INTO briefings (user_id, made_on, body, signals, written_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    today,
    written.body,
    JSON.stringify(signals),
    written.writtenBy,
    new Date().toISOString(),
  );

  // Read it back rather than returning what was just built, so a row written by
  // the other tab a millisecond earlier is what gets shown.
  const stored = db.prepare(`
    SELECT * FROM briefings WHERE user_id = ? AND made_on = ?
  `).get(userId, today);

  return {
    body: stored.body,
    signals: JSON.parse(stored.signals),
    writtenBy: stored.written_by,
    madeOn: stored.made_on,
    isNew: true,
  };
}
