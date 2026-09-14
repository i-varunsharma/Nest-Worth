import { config } from '../../config.js';
import { DEFAULT_MODEL as CLAUDE_DEFAULT_MODEL, isClaudeConfigured, runClaudeRound } from './claude.js';
import { DEFAULT_MODEL as GEMINI_DEFAULT_MODEL, isGeminiConfigured, runGeminiRound } from './gemini.js';

/*
  Which model this server talks to.

  Two are supported, and the app works the same either way. Gemini has a free
  allowance, which is why it is preferred when both are set up: a project that
  costs nothing to run is a project you can leave running.

  Adding a third provider means one more file next door and one more line here.
  Nothing else in the app changes, because everything above this point works in
  the neutral conversation shape described in advice.js.
*/


/*
  Picks a provider.

  AI_PROVIDER settles it when it is set, so a machine with both keys can be told
  which to use. Otherwise whichever key is present wins, and Gemini goes first
  because it is the free one.

  Returns null when neither is set up, and the caller turns that into a message
  rather than a crash. The rest of the app carries on without an AI perfectly
  well; only the coach card goes quiet.
*/
export function chooseProvider() {
  const named = config.ai.provider;

  if (named === 'gemini') {
    return { name: 'gemini', run: runGeminiRound };
  }

  if (named === 'claude') {
    return { name: 'claude', run: runClaudeRound };
  }

  if (isGeminiConfigured() === true) {
    return { name: 'gemini', run: runGeminiRound };
  }

  if (isClaudeConfigured() === true) {
    return { name: 'claude', run: runClaudeRound };
  }

  return null;
}


/* For the line the server prints at startup, so it is obvious which is live. */
export function describeProvider() {
  const provider = chooseProvider();

  if (!provider) {
    return 'not configured';
  }

  if (provider.name === 'gemini') {
    // Read from gemini.js so the startup line cannot name a different model.
    return 'Gemini (' + (config.ai.geminiModel || GEMINI_DEFAULT_MODEL) + ')';
  }

  return 'Claude (' + (config.ai.anthropicModel || CLAUDE_DEFAULT_MODEL) + ')';
}
