import { briefingRepository } from '../repositories/briefingRepository.js';
import { chooseProvider } from '../ai/providers/index.js';
import { findSignals, latestImportedMonth } from '../reports/signals.js';

/*
  The daily note on the dashboard.

  The work is split in two. reports/signals.js finds what is true, as queries with
  numbers attached, so the same data always gives the same findings and they can be
  tested. This file only turns those findings into sentences, which is the one job
  given to the model.
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
  Findings into sentences. Falls back to the findings as written when no model is
  configured or the call fails: signals.js writes each one as a full sentence for
  exactly this case.
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


// The findings joined up, used when no model writes the note.
function plainVersion(signals) {
  return signals.map((signal) => {
    return signal.fact;
  }).join(' ');
}


/*
  Today's note for one person, written on the first request of the day.

  Stored once a day: writing costs a model call, and wording that changed on every
  refresh would read as noise.
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
