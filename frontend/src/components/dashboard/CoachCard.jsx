import { useEffect, useRef, useState } from 'react';
import * as api from '../../lib/api';

/*
  The AI coach on the dashboard.

  The rest of this page is numbers. This is the one place that reads them for
  you, works things out, and says what to do about it.

  It is a short conversation rather than a single answer, so a follow-up like
  "and if I paid double that?" makes sense. The browser holds the conversation
  and sends it back with each question; the server keeps nothing between them.

  Two things arrive from the server while an answer is being written. The text
  itself, a few words at a time, which is why it appears rather than landing.
  And a line saying which calculation is running, because the model does not do
  the arithmetic: it asks the server to run the same functions the dashboard
  uses, and that takes a second worth explaining.

  Which model that is, Gemini or Claude, is the server's business. It picks one
  from whichever key is set, and nothing in the browser needs to know.

  The API key is not in this file, or anywhere else in frontend/. Anything the
  browser downloads can be read by anybody who opens the dev tools.

  Props:
    hasDebts - whether this person has entered any debts, which decides
               which example questions are worth suggesting
*/

// The suggestions under the box. Kept short so the row does not wrap.
const DEBT_SUGGESTIONS = [
  'What if I paid ₹3,000 more on my worst debt?',
  'What if I lose my job?',
  'Can I afford my goals?',
];

const NO_DEBT_SUGGESTIONS = [
  'What if I lose my job?',
  'What if my rent went up ₹5,000?',
  'Can I afford my goals?',
];

// Anything longer than this is a paste, not a question. The server checks the
// same number; this one only saves a pointless round trip.
const MAX_QUESTION_LENGTH = 300;

export default function CoachCard({ hasDebts }) {
  // What is typed in the box.
  const [question, setQuestion] = useState('');

  /*
    The conversation so far, as [{ role, text }].

    'user' and 'assistant' are the words the server's own conversation format
    uses for the two sides, so nothing has to be renamed on the way out.
  */
  const [turns, setTurns] = useState([]);

  // The answer currently being written, before it becomes a finished turn.
  const [streamingText, setStreamingText] = useState('');

  // Which calculation is running, or an empty string when none is.
  const [toolLabel, setToolLabel] = useState('');

  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState('');

  let suggestions = NO_DEBT_SUGGESTIONS;
  if (hasDebts === true) {
    suggestions = DEBT_SUGGESTIONS;
  }

  /*
    Is this card still on screen?

    A ref is a box that survives a re-render without causing one. An answer can
    take ten seconds, and somebody can easily click away in that time. Setting
    state on a card that is no longer there does nothing useful, so we check
    the box first. Every page in this project does the same with stillMounted.
  */
  const isOnScreen = useRef(true);

  useEffect(() => {
    return () => {
      isOnScreen.current = false;
    };
  }, []);

  /*
    Collects the answer as it arrives.

    This is a ref rather than state on purpose. The pieces land faster than
    React re-renders, and reading a state variable inside the handler would
    read whatever it was when the handler was created, losing everything that
    arrived in between. A ref is always current.
  */
  const answerSoFar = useRef('');

  /*
    Sends one question and reads the answer as it is written.
  */
  const ask = async (textToAsk) => {
    setIsThinking(true);
    setError('');
    setStreamingText('');
    setToolLabel('');
    answerSoFar.current = '';

    // The question goes on screen straight away, before the answer starts.
    // Waiting would make the card look like it had ignored the click.
    let questionShown = textToAsk;
    if (questionShown.length === 0) {
      questionShown = 'What should I do this month?';
    }

    const historyToSend = turns.slice();

    setTurns(turns.concat([{ role: 'user', text: questionShown }]));
    setQuestion('');

    await api.askCoach(textToAsk, historyToSend, (event) => {
      if (isOnScreen.current === false) {
        return;
      }

      if (event.type === 'text') {
        answerSoFar.current = answerSoFar.current + event.text;
        setStreamingText(answerSoFar.current);

        // Text means the calculation finished and the answer is being written.
        setToolLabel('');
        return;
      }

      if (event.type === 'tool') {
        setToolLabel(event.label);
        return;
      }

      if (event.type === 'error') {
        setError(event.error);
        return;
      }
    });

    if (isOnScreen.current === false) {
      return;
    }

    setIsThinking(false);
    setToolLabel('');

    // Move the finished answer out of the streaming slot and into the
    // conversation, so the next question has it as context.
    const finished = answerSoFar.current.trim();

    if (finished.length > 0) {
      setTurns((previous) => {
        // A new array rather than a push, because React only re-renders when
        // it is handed something different from what it had.
        return previous.concat([{ role: 'assistant', text: finished }]);
      });
    }

    setStreamingText('');
  };

  const handleSubmit = (event) => {
    // Without this the browser reloads the whole page, which is what a form
    // has always done, and the answer would be gone before it arrived.
    event.preventDefault();

    const trimmed = question.trim();

    if (trimmed.length === 0 || isThinking === true) {
      return;
    }

    ask(trimmed);
  };

  const handleReset = () => {
    setTurns([]);
    setStreamingText('');
    setError('');
    setToolLabel('');
  };

  const hasConversation = turns.length > 0;

  return (
    <div className="rounded-[26px] border border-line bg-surface p-6 shadow-card sm:p-7">

      {/* ---------- Heading ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="flex items-center gap-2.5 text-2xs font-semibold uppercase tracking-widest2 text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Your coach
        </p>

        {hasConversation === true ? (
          <button
            type="button"
            onClick={handleReset}
            className="text-2xs text-muted transition-colors duration-300 hover:text-ink"
          >
            Start over
          </button>
        ) : (
          <p className="text-2xs text-muted">Runs your real numbers</p>
        )}
      </div>

      {/* ---------- The opening question, until there is a conversation ---------- */}
      {hasConversation === false ? (
        <button
          type="button"
          onClick={() => ask('')}
          disabled={isThinking}
          className="mt-5 w-full rounded-2xl bg-ink px-5 py-4 text-left font-display text-[20px] leading-snug text-paper transition-all duration-300 ease-smooth hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60 sm:text-[22px]"
        >
          What should I do this month?
        </button>
      ) : null}

      {/* ---------- The conversation ---------- */}
      {hasConversation === true ? (
        <div className="mt-5 space-y-3">
          {turns.map((turn, index) => {
            if (turn.role === 'user') {
              return (
                <p
                  key={index}
                  className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-ink px-4 py-2.5 text-[14px] text-paper"
                >
                  {turn.text}
                </p>
              );
            }

            return (
              <div
                key={index}
                className="rounded-2xl border border-accent/25 bg-accentSoft p-4 sm:p-5"
              >
                <Paragraphs text={turn.text} />
              </div>
            );
          })}

          {/* The answer being written right now. */}
          {streamingText ? (
            <div className="rounded-2xl border border-accent/25 bg-accentSoft p-4 sm:p-5">
              <Paragraphs text={streamingText} />
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ---------- What it is doing ---------- */}
      {/* Only while nothing has been written yet, so it does not sit under text
          that is already appearing. */}
      {isThinking === true && streamingText === '' ? (
        <p className="mt-4 flex items-center gap-2.5 text-[13.5px] text-muted">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
          {toolLabel ? toolLabel : 'Thinking'}
          <span className="sr-only">, please wait</span>
        </p>
      ) : null}

      {/* ---------- Anything that went wrong ---------- */}
      {error ? (
        <p className="mt-4 rounded-2xl border border-clay/20 bg-claySoft p-4 text-[14px] leading-relaxed text-ink2">
          {error}
        </p>
      ) : null}

      {/* ---------- Ask something ---------- */}
      <form onSubmit={handleSubmit} className="mt-5">
        <div className="flex gap-2.5">
          <input
            type="text"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask about your own money…"
            maxLength={MAX_QUESTION_LENGTH}
            className="w-full rounded-full border border-line bg-paper px-5 py-3 text-[14.5px] text-ink outline-none transition-colors duration-300 placeholder:text-muted focus:border-ink"
          />

          <button
            type="submit"
            disabled={isThinking}
            className="shrink-0 rounded-full border border-line bg-surface px-5 text-[14px] font-semibold text-ink transition-all duration-300 ease-smooth hover:border-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            Ask
          </button>
        </div>

        {/* The suggestions are only worth the space before a conversation
            starts. After that the person knows what to type. */}
        {hasConversation === false ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {suggestions.map((suggestion) => {
              return (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => ask(suggestion)}
                  disabled={isThinking}
                  className="rounded-full border border-line bg-paper px-3.5 py-1.5 text-[12.5px] text-muted transition-all duration-300 ease-smooth hover:border-accent/40 hover:bg-accentSoft hover:text-accentDeep disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {suggestion}
                </button>
              );
            })}
          </div>
        ) : null}
      </form>

      {/*
        No provider is named here on purpose. The server decides whether it is
        talking to Gemini or Claude from whichever key is set, so a name in the
        browser would be a guess, and would be wrong the moment the key changes.
      */}
      <p className="mt-5 text-2xs leading-relaxed text-muted">
        Written by an AI, running this app&rsquo;s own calculations on the numbers you
        entered. Educational guidance, not regulated advice.
      </p>
    </div>
  );
}


/*
  Splits an answer on its blank lines so it reads as paragraphs rather than one
  block. Its own small component because two places need it: the finished turns
  and the one still being written.
*/
function Paragraphs({ text }) {
  const lines = text.split('\n');
  const paragraphs = [];

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (trimmed.length > 0) {
      paragraphs.push(trimmed);
    }
  });

  return (
    <>
      {paragraphs.map((paragraph, index) => {
        return (
          <p key={index} className="mt-2 text-[15px] leading-relaxed text-ink2 first:mt-0">
            {paragraph}
          </p>
        );
      })}
    </>
  );
}
