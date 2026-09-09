import db from '../database/db.js';
import { chooseProvider } from './ai/index.js';
import { MAX_TOOL_ROUNDS, describeTool, runTool, toolDefinitions } from './tools.js';

/*
  The only file in the project that talks to Claude.

  Two rules shaped everything below.

  The API key stays here, on the server. A key in frontend code is a key
  anybody can read in their browser and spend your money with. Same reason the
  session cookie is checked here rather than trusted from the browser.

  The numbers are read from the database, not asked for from the model. A
  language model will state a wrong figure with complete confidence. So this
  file collects the person's real rows, does the small sums in JavaScript, and
  hands the finished figures to Claude. Claude's job is to explain them and pick
  what matters, never to produce them.
*/

/*
  The ceiling on one round of the loop.

  The answer itself is meant to be short, and the system prompt says so. This
  has to leave room for more than the answer though: a round where Claude asks
  for two tools spends output tokens writing those requests before any of the
  reply is written.
*/
const MAX_TOKENS = 1500;

// A question longer than this is almost always a paste, not a question.
const MAX_QUESTION_LENGTH = 300;

// How many debts, goals or assets to name in the prompt. See readFacts below.
const MAX_ROWS_IN_PROMPT = 20;

/*
  How many earlier turns of the conversation to carry.

  Every turn is re-sent on every question and charged again, so a conversation
  that never forgets gets slower and more expensive with each message. Four
  exchanges is enough for "and what if I paid double that?" to make sense.
*/
export const MAX_HISTORY_TURNS = 8;

/*
  The instructions Claude gets before it sees any of the user's data.

  Most of this is about tone. The rest is a guard: the app is a student project
  giving educational guidance, not a registered adviser, and the model must not
  write as if it were one.
*/
const SYSTEM_PROMPT = `You are the money coach inside Nestworth, an app for Indian households.

You are given somebody's real financial numbers, and a set of tools that run the app's own calculations on those numbers.

Using the tools:
- The numbers you are given are a snapshot. Anything that needs working out - a payoff date, months saved, whether goals fit, how long an emergency fund lasts - comes from a tool. Call it.
- Call a tool before suggesting something, not after. "Pay 3000 more" is worth saying once you know it saves 14 months; before that it is a guess.
- You may call several in one turn, and call one again with different numbers to compare.
- Never do the arithmetic yourself. You are good at knowing which calculation matters and bad at running it, and a wrong figure said confidently is the worst thing this app can do.

How to answer:
- Write plain English at about the level of a friend who happens to be good with money.
- Be short. Three or four sentences, or up to four bullet points. Never longer.
- Give ONE clear next action, not a list of options.
- Use the exact figures from the tools and the snapshot. Never invent a number, a date, an interest rate or a fund name. If something is missing, say what to add to the app instead of guessing.
- Amounts are Indian rupees. Write them as ₹42,000 or ₹1.2L, never as $ or in words.
- No greetings, no sign-off, no "as an AI", no markdown headings.

What you must not do:
- Do not recommend a specific stock, mutual fund, insurance policy or bank.
- Do not promise a return.
- Do not claim to be a registered financial adviser. This is educational guidance.`;


/*
  Rounds to whole rupees. Money in the database is stored as REAL because an
  EMI can have paise in it, and a total of ten of those ends up looking like
  48333.000000000004, which is not something to show anybody.
*/
function round(amount) {
  return Math.round(amount);
}


/*
  Reads everything this person has entered and works out the few totals the
  prompt needs.

  Every query filters on user_id from the session, so there is no way to ask
  about somebody else's money by changing a number in a request.
*/
export function readFacts(userId) {
  const household = db
    .prepare('SELECT * FROM households WHERE user_id = ?')
    .get(userId);

  /*
    The lists are capped.

    Nothing stops somebody adding four hundred assets, and every row goes into
    the prompt, which is charged by the token. A cap keeps one question a
    predictable size however much is in the account.

    Each list is ordered so the cap keeps the rows that matter: the most
    expensive debt, the soonest goal, the largest asset. The totals below are
    still added up from EVERY row, so the summary stays right even when the
    list shown to the model is cut short.
  */
  const debts = db
    .prepare('SELECT * FROM debts WHERE user_id = ? ORDER BY annual_rate DESC LIMIT ?')
    .all(userId, MAX_ROWS_IN_PROMPT);

  const goals = db
    .prepare('SELECT * FROM goals WHERE user_id = ? ORDER BY target_date ASC LIMIT ?')
    .all(userId, MAX_ROWS_IN_PROMPT);

  const assets = db
    .prepare('SELECT * FROM assets WHERE user_id = ? ORDER BY value DESC LIMIT ?')
    .all(userId, MAX_ROWS_IN_PROMPT);

  // Only the recent months. A year of check-ins would fill the prompt with
  // history nobody is asking about, and cost more for a worse answer.
  const checkins = db
    .prepare('SELECT * FROM checkins WHERE user_id = ? ORDER BY month DESC LIMIT 6')
    .all(userId);

  /*
    The sums, done in SQL over every row rather than over the capped lists
    above. A total that only counted the first twenty debts would be wrong, and
    a wrong total is the one thing this whole file exists to prevent.

    COALESCE turns the NULL that SUM returns for no rows at all into 0.
  */
  const debtTotals = db.prepare(`
    SELECT COALESCE(SUM(principal), 0) AS owed, COALESCE(SUM(emi), 0) AS emi
    FROM debts WHERE user_id = ?
  `).get(userId);

  const assetTotals = db.prepare(`
    SELECT COALESCE(SUM(value), 0) AS owned FROM assets WHERE user_id = ?
  `).get(userId);

  const totalOwed = debtTotals.owed;
  const totalEmi = debtTotals.emi;
  const totalOwned = assetTotals.owned;

  return {
    household: household,
    debts: debts,
    goals: goals,
    assets: assets,
    checkins: checkins,
    totalOwed: round(totalOwed),
    totalEmi: round(totalEmi),
    totalOwned: round(totalOwned),
    netWorth: round(totalOwned - totalOwed),
  };
}


/*
  Turns those rows into the plain lines Claude reads.

  It is deliberately boring text rather than JSON. A model reads
  "Credit card, ₹84,000 left at 38% a year" more reliably than it reads a
  nested object, and when something looks wrong in the answer this format is
  the one you can print and check by eye.
*/
export function factsToText(facts) {
  const lines = [];

  const household = facts.household;

  /*
    Today's date, first.

    Without it a goal "wanted by 2027-03-01" means nothing: the model cannot
    tell whether that is six months away or three years, and it will guess
    rather than say it does not know. A model's own sense of the date comes
    from when it was trained, so it is exactly the kind of fact to hand it
    rather than trust it for.
  */
  const today = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  lines.push('TODAY IS ' + today);
  lines.push('');

  lines.push('HOUSEHOLD');
  lines.push('Take-home income: ₹' + round(household.income) + ' a month');
  lines.push('People depending on this income: ' + household.dependents);

  if (household.income_varies === 1) {
    lines.push('Income changes month to month.');
  } else {
    lines.push('Income is the same every month.');
  }

  if (household.essential_costs > 0) {
    lines.push('Essential costs (rent, food, bills): ₹' + round(household.essential_costs) + ' a month');
  } else {
    lines.push('Essential costs: not answered yet.');
  }

  lines.push('');
  lines.push('WHAT THEY OWE');

  if (facts.debts.length === 0) {
    lines.push('No debts recorded.');
  } else {
    facts.debts.forEach((debt) => {
      lines.push(
        '- ' + debt.name
        + ': ₹' + round(debt.principal) + ' still owed'
        + ' at ' + debt.annual_rate + '% a year'
        + ', EMI ₹' + round(debt.emi) + ' a month',
      );
    });

    lines.push('Total owed: ₹' + facts.totalOwed + '. Total EMI: ₹' + facts.totalEmi + ' a month.');
    lines.push('The list is sorted by interest rate, so the first one is the most expensive.');
  }

  lines.push('');
  lines.push('WHAT THEY OWN');

  if (facts.assets.length === 0) {
    lines.push('No assets recorded.');
  } else {
    facts.assets.forEach((asset) => {
      lines.push('- ' + asset.name + ' (' + asset.kind + '): ₹' + round(asset.value));
    });

    lines.push('Total owned: ₹' + facts.totalOwned + '.');
  }

  lines.push('Net worth: ₹' + facts.netWorth + '.');

  lines.push('');
  lines.push('WHAT THEY ARE SAVING FOR');

  if (facts.goals.length === 0) {
    lines.push('No goals recorded.');
  } else {
    facts.goals.forEach((goal) => {
      lines.push(
        '- ' + goal.name
        + ': ₹' + round(goal.saved_amount) + ' saved of ₹' + round(goal.target_amount)
        + ', wanted by ' + goal.target_date,
      );
    });
  }

  lines.push('');
  lines.push('RECENT MONTHS');

  if (facts.checkins.length === 0) {
    lines.push('No months recorded yet.');
  } else {
    facts.checkins.forEach((checkin) => {
      let line = '- ' + checkin.month
        + ': earned ₹' + round(checkin.income)
        + ', spent ₹' + round(checkin.spent)
        + ', saved ₹' + round(checkin.saved)
        + ', invested ₹' + round(checkin.invested);

      /*
        The note the person wrote about that month, if they wrote one.

        This is the only thing in the whole prompt that is not a number, and it
        is often the most useful line in it. "Sister's wedding" explains a bad
        month in a way the figures never will, and a coach that ignores it
        sounds like it is telling somebody off for something they already know
        about.
      */
      if (checkin.note) {
        line = line + '. They wrote: "' + checkin.note + '"';
      }

      lines.push(line);
    });
  }

  return lines.join('\n');
}


/*
  Asks the model, and streams the answer back as it is written.

  This is an agent loop, and it is worth understanding because it is the whole
  feature. It goes round like this:

    1. Send the conversation and the list of tools.
    2. The model streams back some text, and may also ask to run one or more
       tools.
    3. If it asked, we run them here, add the results to the conversation, and
       go round again. If it did not, it has finished and we stop.

  Nothing is hidden inside a library: the loop is these thirty lines, which is
  why it is written out by hand rather than using a helper that does it for you.
  It also means we can tell the browser which tool is running, so the card can
  say "checking your goals" instead of sitting still.

  ---------------------------------------------------------------
  The conversation is kept in a shape neither provider uses
  ---------------------------------------------------------------

  Every entry in `messages` below is one of three things:

    { role, text }        somebody said something
    { toolCalls: [...] }  the model asked for a calculation
    { toolResults: [...] } we ran it and this is what came back

  Claude and Gemini both want that expressed differently: different names for
  the two sides, different envelopes for a tool call, different words for the
  system prompt. Keeping our own shape here and translating in lib/ai/ means
  the loop is written once and reads the same whichever model is answering.

  Rather than returning the answer, this calls onEvent as things happen:

    { type: 'text',  text }        a piece of the answer, as it is written
    { type: 'tool',  label }       a tool started running
    { type: 'error', error }       it went wrong, and this is what to show

  Streaming matters more here than it looks. A tool round means two or three
  calls to the model, so the whole thing can take ten seconds, and ten seconds
  of a spinner feels broken in a way that ten seconds of text appearing does not.
*/
export async function askClaude(userId, facts, history, question, onEvent) {
  const provider = chooseProvider();

  if (!provider) {
    onEvent({
      type: 'error',
      error: 'The AI coach is not set up on this server yet. Put a GEMINI_API_KEY '
        + '(free) or an ANTHROPIC_API_KEY in backend/.env, then restart the API.',
    });
    return;
  }

  let task = 'Look at these numbers and tell them the single most useful thing to do with '
    + 'their money this month, and why. Use a tool to check anything you want to suggest.';

  if (question) {
    task = question;
  }

  /*
    The snapshot goes in the first message rather than the system prompt, so it
    sits with the question it belongs to. Earlier turns are added after it, so
    a follow-up like "and if I paid double that?" has something to refer to.
  */
  const messages = [];

  messages.push({
    role: 'user',
    text: 'Here are their numbers.\n\n' + factsToText(facts),
  });

  messages.push({
    role: 'assistant',
    text: 'Understood. I have their numbers and I will use the tools for anything I need to work out.',
  });

  history.forEach((turn) => {
    messages.push({ role: turn.role, text: turn.text });
  });

  messages.push({ role: 'user', text: task });

  const tools = toolDefinitions();

  try {
    // A cap, because a loop with no end is a loop that keeps asking forever.
    for (let round = 0; round < MAX_TOOL_ROUNDS; round = round + 1) {
      const reply = await provider.run({
        system: SYSTEM_PROMPT,
        messages: messages,
        tools: tools,
        maxTokens: MAX_TOKENS,
        onText: (piece) => {
          onEvent({ type: 'text', text: piece });
        },
      });

      // No tools asked for means the answer is finished.
      if (reply.toolCalls.length === 0) {
        return;
      }

      // The model's own turn has to go back into the conversation exactly as it
      // came, tool requests and all, or the results below have nothing to
      // attach to.
      messages.push({ toolCalls: reply.toolCalls });

      const results = [];

      reply.toolCalls.forEach((call) => {
        onEvent({ type: 'tool', label: describeTool(call.name, call.input) });

        results.push({
          id: call.id,
          name: call.name,
          output: runTool(userId, call.name, call.input),
        });
      });

      messages.push({ toolResults: results });
    }

    // Only reached if it kept asking for tools until the cap ran out.
    onEvent({
      type: 'error',
      error: 'That question took more working out than the coach allows. Try asking something narrower.',
    });
  } catch (error) {
    /*
      The providers throw with a message written to be shown: a wrong key, a
      used-up allowance, a model name that no longer exists. Anything else has
      already been logged where it happened.
    */
    onEvent({ type: 'error', error: error.message });
  }
}


/* Checks a typed question. Returns an error message, or an empty string. */
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
