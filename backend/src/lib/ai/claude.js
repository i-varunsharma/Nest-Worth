import Anthropic from '@anthropic-ai/sdk';

/*
  Talking to Anthropic's Claude.

  The other half of the pair with gemini.js. Same conversation in, same answer
  out, so lib/advice.js never has to know which one is running.

  This one uses the official SDK rather than fetch, because it is already
  installed and it handles the streaming for us. Gemini's file uses plain fetch
  instead, which is a fair comparison to have in the project: one shows what an
  SDK saves you, the other shows what it was doing.
*/

// The exact id the API expects. No date after it.
const DEFAULT_MODEL = 'claude-opus-5';


/*
  Turns our neutral conversation into the shape Claude expects.

  Claude keeps a tool request and its result as blocks inside ordinary turns,
  which is close enough to our own shape that this is mostly renaming.
*/
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
      /*
        Every result goes back in ONE user message. Splitting them across
        several teaches Claude to stop asking for more than one at a time,
        which makes every later answer slower for no reason.
      */
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


/*
  One round of the conversation. Same contract as runGeminiRound:
  returns { text, toolCalls }, and throws with a message meant to be shown.
*/
export async function runClaudeRound(options) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

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
      options.onText(piece);
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

  // The model can decline outright. It will not happen for a budgeting
  // question, but reading the content without checking would hand back an
  // empty card with no explanation if it ever did.
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
  if (process.env.ANTHROPIC_API_KEY) {
    return true;
  }

  return false;
}
