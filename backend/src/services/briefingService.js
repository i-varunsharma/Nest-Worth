import { briefingRepository } from '../repositories/briefingRepository.js';
import { chooseProvider } from '../ai/providers/index.js';
import { findSignals, latestImportedMonth } from '../reports/signals.js';

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

  Stored once a day rather than written on every page load: writing costs a call
  to a model, and wording that changed on every refresh would read as noise.
*/
export async function briefingForToday(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const existing = briefingRepository.findForDay(userId, today);

  if (existing !== null) {
    return { ...existing, isNew: false };
  }

  const month = latestImportedMonth(userId);
  const signals = findSignals(userId, month);
  const written = await writeBriefing(signals);

  // Read back what was stored: another tab may have saved today's note first.
  const stored = briefingRepository.saveOnce(userId, today, {
    body: written.body,
    signals: signals,
    writtenBy: written.writtenBy,
  });

  return { ...stored, isNew: true };
}
