import { config } from '../../config.js';
import { DEFAULT_MODEL as CLAUDE_DEFAULT_MODEL, isClaudeConfigured, runClaudeRound } from './claude.js';
import { DEFAULT_MODEL as GEMINI_DEFAULT_MODEL, isGeminiConfigured, runGeminiRound } from './gemini.js';

/*
  Chooses which model provider answers.

  Adding a provider means one more file in this folder and one more branch below.
  Nothing else changes, because the rest of the AI code uses the neutral
  conversation shape described in ai/advice.js.
*/


// AI_PROVIDER decides when set. Otherwise the provider with a key wins, Gemini
// first because it has a free tier. Returns null when neither is configured.
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
