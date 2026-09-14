import { chooseProvider } from './providers/index.js';
import { factsToText } from './facts.js';
import { DEFAULT_QUESTION, SYSTEM_PROMPT } from './prompt.js';
import { MAX_TOOL_ROUNDS, describeTool, runTool, toolDefinitions } from './tools.js';


/*
  The coach's agent loop.

    1. Send the conversation and the tool list to the model.
    2. The model streams text, and may ask to run tools.
    3. If it asked, run them, add the results, and go round again.
    4. If it did not, the answer is finished.

  The conversation is kept in a neutral shape, and the files in providers/
  translate it for Gemini or Claude, so this loop is written once:

    { role, text }            a turn of text
    { toolCalls: [...] }      the model asked for calculations
    { toolResults: [...] }    what those calculations returned

  Results are reported through onEvent as they happen:
    { type: 'text', text }, { type: 'tool', label }, { type: 'error', error }
*/

// Covers the model's thinking and tool requests as well as the answer. The
// prompt keeps the answer short; set this too low and replies are cut off.
const MAX_TOKENS = 2500;

// A question longer than this is almost always a paste.
const MAX_QUESTION_LENGTH = 300;

// Every earlier turn is re-sent and charged on each question. Four exchanges is
// enough for a follow-up like "and if I paid double that?" to make sense.
export const MAX_HISTORY_TURNS = 8;


const NOT_CONFIGURED = 'The AI coach is not set up on this server yet. Put a GEMINI_API_KEY '
  + '(free) or an ANTHROPIC_API_KEY in backend/.env, then restart the API.';


/* The opening messages: the person's numbers, then the earlier conversation, then the question. */
function openingMessages(facts, history, question) {
  const messages = [
    { role: 'user', text: 'Here are their numbers.\n\n' + factsToText(facts) },
    { role: 'assistant', text: 'Understood. I have their numbers and I will use the tools for anything I need to work out.' },
  ];

  history.forEach((turn) => {
    messages.push({ role: turn.role, text: turn.text });
  });

  let task = DEFAULT_QUESTION;
  if (question) {
    task = question;
  }

  messages.push({ role: 'user', text: task });

  return messages;
}


export async function askCoach(userId, facts, history, question, onEvent) {
  const provider = chooseProvider();

  if (provider === null) {
    onEvent({ type: 'error', error: NOT_CONFIGURED });
    return;
  }

  const messages = openingMessages(facts, history, question);
  const tools = toolDefinitions();

  // Lives for this one question, so every round prefers the same model.
  const conversation = {};
  let hasAnswered = false;

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round = round + 1) {
      const reply = await provider.run({
        system: SYSTEM_PROMPT,
        messages: messages,
        tools: tools,
        maxTokens: MAX_TOKENS,
        conversation: conversation,
        onText: (piece) => {
          hasAnswered = true;
          onEvent({ type: 'text', text: piece });
        },
      });

      if (reply.toolCalls.length === 0) {
        // A model can finish with no text, for example when thinking used the
        // whole budget. Say so rather than leave the card empty.
        if (hasAnswered === false) {
          onEvent({ type: 'error', error: 'The coach did not come back with an answer. Please try again.' });
        }
        return;
      }

      // The model's request goes back into the conversation as it came, so the
      // results have something to attach to.
      messages.push({ toolCalls: reply.toolCalls });

      const results = reply.toolCalls.map((call) => {
        onEvent({ type: 'tool', label: describeTool(call.name, call.input) });

        return { id: call.id, name: call.name, output: runTool(userId, call.name, call.input) };
      });

      messages.push({ toolResults: results });
    }

    onEvent({
      type: 'error',
      error: 'That question took more working out than the coach allows. Try asking something narrower.',
    });
  } catch (error) {
    // Providers throw with a message written to be shown to the person.
    onEvent({ type: 'error', error: error.message });
  }
}


/* Returns an error message for a question that cannot be asked, or ''. */
export function checkQuestion(question) {
  if (question === undefined || question === null || question === '') {
    return '';
  }

  if (typeof question !== 'string') {
    return 'That question does not look right.';
  }

  if (question.trim().length > MAX_QUESTION_LENGTH) {
    return 'Please keep the question under ' + MAX_QUESTION_LENGTH + ' characters.';
  }

  return '';
}
