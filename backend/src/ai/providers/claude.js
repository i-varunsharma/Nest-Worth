import Anthropic from '@anthropic-ai/sdk';
import { config } from '../../config.js';

/*
  Anthropic's Claude, through the official SDK.

  The other provider next to gemini.js, with the same contract: the neutral
  conversation in, { text, toolCalls } out.
*/

// The exact id the API expects. No date after it.
export const DEFAULT_MODEL = 'claude-opus-5';


// Our conversation in Claude's shape. Tool calls and results are content blocks
// inside ordinary turns, so this is mostly renaming.
function toClaudeMessages(messages) {
  return messages.map((entry) => {
    if (entry.toolCalls) {
      return {
        role: 'assistant',
        content: entry.toolCalls.map((call) => {
          return { type: 'tool_use', id: call.id, name: call.name, input: call.input };
        }),
      };
    }

    if (entry.toolResults) {
      // All results go back in one user message. Split across several, Claude learns to
      // ask for one tool at a time, which makes answers slower.
      return {
        role: 'user',
        content: entry.toolResults.map((result) => {
          return { type: 'tool_result', tool_use_id: result.id, content: result.output };
        }),
      };
    }

    return { role: entry.role, content: entry.text };
  });
}


// One round. Same contract as runGeminiRound: returns { text, toolCalls } and
// throws with a message meant to be shown.
export async function runClaudeRound(options) {
  const client = new Anthropic({ apiKey: config.ai.anthropicApiKey });
  const model = config.ai.anthropicModel || DEFAULT_MODEL;

  let reply;

  try {
    const stream = client.messages.stream({
      model: model,
      max_tokens: options.maxTokens,
      system: options.system,
      tools: options.tools,
      messages: toClaudeMessages(options.messages),
    });

    stream.on('text', (piece) => {
      if (typeof options.onText === 'function') {
        options.onText(piece);
      }
    });

    reply = await stream.finalMessage();
  } catch (error) {
    console.error('Claude refused the request:', error);

    if (error.status === 401) {
      throw new Error('That Claude API key was refused. Check ANTHROPIC_API_KEY in backend/.env.');
    }
    if (error.status === 429) {
      throw new Error('The Claude allowance is used up for now. Try again in a minute.');
    }

    throw new Error('Claude would not answer. Please try again.');
  }

  // Checked so a refusal shows a message instead of an empty card.
  if (reply.stop_reason === 'refusal') {
    throw new Error('The model would not answer that one. Try asking it differently.');
  }

  let text = '';
  const toolCalls = [];

  reply.content.forEach((block) => {
    if (block.type === 'text') {
      text = text + block.text;
      return;
    }

    if (block.type === 'tool_use') {
      toolCalls.push({ id: block.id, name: block.name, input: block.input });
    }
  });

  return { text: text, toolCalls: toolCalls };
}


/* Whether this provider is set up. Used to pick one in index.js. */
export function isClaudeConfigured() {
  return config.ai.anthropicApiKey !== '';
}
