import { config } from '../../config.js';

/*
  Google's Gemini, over plain fetch.

  One of two providers; claude.js is the other. Both take the neutral conversation
  from ai/advice.js and return { text, toolCalls }, so the agent loop does not know
  which model it is talking to. This file translates:

    roles      'assistant' becomes 'model'
    system     sent as systemInstruction, not as a turn
    tools      sent as functionDeclarations with UPPERCASE type names
    results    sent back as functionResponse parts in a user turn
*/

const GOOGLE_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/';

function baseUrl() {
  return config.ai.geminiBaseUrl || GOOGLE_BASE_URL;
}

// gemini-3.6-flash answered in about two seconds in testing. gemini-3.8-flash took
// ten seconds or more and often returned 503. GEMINI_MODEL overrides this.
export const DEFAULT_MODEL = 'gemini-3.6-flash';

// Tried in order when a model is busy (503), over its free allowance (429) or gone
// (404). Each model has its own allowance.
export const FALLBACK_MODELS = ['gemini-3.5-flash', 'gemini-3.5-flash-lite'];

// Statuses worth trying the next model for. Anything else, such as a bad key or
// a badly built request, would fail the same way on every model.
const TRY_NEXT_MODEL_ON = [404, 429, 500, 503, 504];

/*
  Gemini 3 models think before answering, and those tokens count against
  maxOutputTokens. With the default level a 400 token limit was used up by thinking
  and the answer stopped mid-sentence.
*/
const THINKING_LEVEL = 'low';

// Sent instead of a thought signature written by a different model, after a
// fallback. Google documents this value; a missing or foreign signature is a 400.
const SKIP_SIGNATURE = 'skip_thought_signature_validator';


// Our tool list in Gemini's shape. Type names must be UPPERCASE, and a tool with no
// arguments must leave parameters out entirely: an empty properties object is rejected.
export function toGeminiTools(tools) {
  const declarations = tools.map((tool) => {
    const declaration = {
      name: tool.name,
      description: tool.description,
    };

    const properties = tool.input_schema.properties;
    const names = Object.keys(properties);

    if (names.length > 0) {
      const converted = {};

      names.forEach((name) => {
        const property = properties[name];

        converted[name] = {
          type: property.type.toUpperCase(),
          description: property.description,
        };
      });

      declaration.parameters = {
        type: 'OBJECT',
        properties: converted,
        required: tool.input_schema.required,
      };
    }

    return declaration;
  });

  return [{ functionDeclarations: declarations }];
}


/*
  Our conversation as Gemini's contents list:

    { role, text }       ->  parts: [{ text }]
    { toolCalls }        ->  parts: [{ functionCall }]
    { toolResults }      ->  parts: [{ functionResponse }]

  model is the model this request goes to. A call it did not write gets
  SKIP_SIGNATURE instead of the original signature.
*/
export function toGeminiContents(messages, model) {
  return messages.map((entry) => {
    if (entry.toolCalls) {
      return {
        role: 'model',
        parts: entry.toolCalls.map((call) => {
          const part = { functionCall: { name: call.name, args: call.input } };

          // Newer models sign their tool calls and refuse the next round if
          // the signature is not sent back with the call.
          if (call.signature && call.model === model) {
            part.thoughtSignature = call.signature;
          } else if (call.signature) {
            part.thoughtSignature = SKIP_SIGNATURE;
          }

          return part;
        }),
      };
    }

    if (entry.toolResults) {
      // The result goes back in a user turn, wrapped in an object as the field requires.
      return {
        role: 'user',
        parts: entry.toolResults.map((result) => {
          return {
            functionResponse: {
              name: result.name,
              response: { result: result.output },
            },
          };
        }),
      };
    }

    let role = 'user';
    if (entry.role === 'assistant') {
      role = 'model';
    }

    return { role: role, parts: [{ text: entry.text }] };
  });
}


// Takes the complete Server-Sent Events out of a buffer and hands each one on.
// Returns what is left, which is an event still arriving.
function readEvents(buffer, onEvent) {
  // Google ends events with \r\n\r\n. Splitting on \n\n alone found no events and
  // every real answer was empty, so \r\n is normalised first.
  const pieces = buffer.replaceAll('\r\n', '\n').split('\n\n');

  // Whatever follows the last blank line has not finished arriving.
  const leftover = pieces.pop();

  pieces.forEach((piece) => {
    const line = piece.trim();

    if (line.startsWith('data:') === false) {
      return;
    }

    try {
      onEvent(JSON.parse(line.slice(5).trim()));
    } catch {
      // A half-written event is not worth taking the answer down over.
    }
  });

  return leftover;
}


// The models to try, in order. A conversation prefers the model it already used,
// so its real signatures stay valid.
function modelsToTry(conversation) {
  const models = [];

  if (conversation && conversation.model) {
    models.push(conversation.model);
  }

  const chosen = config.ai.geminiModel || DEFAULT_MODEL;

  if (models.includes(chosen) === false) {
    models.push(chosen);
  }

  FALLBACK_MODELS.forEach((model) => {
    if (models.includes(model) === false) {
      models.push(model);
    }
  });

  return models;
}


/* Turns a refusal from Google into a sentence the coach card can show. */
function refusalMessage(status, model) {
  if (status === 404) {
    return 'Gemini has no model called "' + model + '". Google renames these; '
      + 'pick a current one from ai.google.dev and set GEMINI_MODEL in backend/.env.';
  }

  if (status === 429) {
    return 'The free Gemini allowance is used up for now. Try again in a minute.';
  }

  if (status === 500 || status === 503 || status === 504) {
    return 'Gemini is busy right now. Try again in a moment.';
  }

  return 'Gemini would not answer. Please try again.';
}


/*
  One round of the conversation.

    system        the instructions
    messages      the neutral conversation
    tools         the tool list, in this app's shape
    maxTokens     the ceiling for the round, thinking included
    onText        optional, called with each piece of text as it arrives
    conversation  optional object shared by every round of one question

  Returns { text, toolCalls, model, finishReason }. Throws with a message meant
  for the person when every model refuses.
*/
export async function runGeminiRound(options) {
  const apiKey = config.ai.geminiApiKey;

  const body = {
    systemInstruction: { parts: [{ text: options.system }] },
    contents: [],
    generationConfig: {
      maxOutputTokens: options.maxTokens,
      thinkingConfig: { thinkingLevel: THINKING_LEVEL },
    },
  };

  // A request with an empty tool list is rejected, so it is left out entirely.
  if (options.tools.length > 0) {
    body.tools = toGeminiTools(options.tools);
  }

  let response = null;
  let usedModel = '';
  let lastStatus = 0;
  let lastModel = '';

  for (const model of modelsToTry(options.conversation)) {
    const url = baseUrl() + model + ':streamGenerateContent?alt=sse';

    // Built per model, because the signatures depend on which model is asked.
    body.contents = toGeminiContents(options.messages, model);

    let attempt;

    try {
      // The key goes in a header rather than the address, so it never ends up
      // in a log line that prints URLs.
      attempt = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body),
      });
    } catch (error) {
      console.error('Could not reach Gemini:', error.message);
      throw new Error('Could not reach Gemini. Check the internet connection and try again.');
    }

    if (attempt.ok) {
      response = attempt;
      usedModel = model;
      break;
    }

    const detail = await attempt.text();
    console.error('Gemini refused the request:', model, attempt.status, detail.slice(0, 300));

    if (attempt.status === 400 && detail.includes('API key not valid')) {
      throw new Error('That Gemini API key was refused. Check GEMINI_API_KEY in backend/.env.');
    }

    if (TRY_NEXT_MODEL_ON.includes(attempt.status) === false) {
      throw new Error(refusalMessage(attempt.status, model));
    }

    lastStatus = attempt.status;
    lastModel = model;
  }

  if (response === null) {
    throw new Error(refusalMessage(lastStatus, lastModel));
  }

  if (options.conversation) {
    options.conversation.model = usedModel;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let buffer = '';
  let text = '';
  let finishReason = '';
  const toolCalls = [];

  // Handles one event from the stream: collects text and tool calls.
  const handleEvent = (event) => {
    if (!event.candidates || event.candidates.length === 0) {
      return;
    }

    const candidate = event.candidates[0];

    // Only the last event carries this. MAX_TOKENS means the answer was cut.
    if (candidate.finishReason) {
      finishReason = candidate.finishReason;
    }

    if (!candidate.content || !candidate.content.parts) {
      return;
    }

    candidate.content.parts.forEach((part) => {
      if (typeof part.text === 'string' && part.text.length > 0) {
        text = text + part.text;

        // The daily briefing does not stream, so it passes no onText.
        if (typeof options.onText === 'function') {
          options.onText(part.text);
        }
        return;
      }

      if (part.functionCall) {
        // Gemini gives a function call no id, so one is made from its position.
        const call = {
          id: 'call_' + toolCalls.length,
          name: part.functionCall.name,
          input: part.functionCall.args || {},
        };

        // Kept, with the model that wrote it, so toGeminiContents can send it
        // back next round.
        if (part.thoughtSignature) {
          call.signature = part.thoughtSignature;
          call.model = usedModel;
        }

        toolCalls.push(call);
      }
    });
  };

  while (true) {
    const chunk = await reader.read();

    if (chunk.done === true) {
      break;
    }

    buffer = buffer + decoder.decode(chunk.value, { stream: true });
    buffer = readEvents(buffer, handleEvent);
  }

  // The last event may arrive without a blank line after it. Adding one makes
  // sure it is read rather than left in the buffer.
  readEvents(buffer + '\n\n', handleEvent);

  if (finishReason === 'MAX_TOKENS') {
    console.error('Gemini stopped at the token limit on ' + usedModel + '. The answer may be cut short.');
  }

  return { text: text, toolCalls: toolCalls, model: usedModel, finishReason: finishReason };
}


/* Whether this provider is set up. Used to pick one in ai/index.js. */
export function isGeminiConfigured() {
  return config.ai.geminiApiKey !== '';
}
