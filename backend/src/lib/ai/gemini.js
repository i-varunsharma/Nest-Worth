/*
  Talking to Google's Gemini.

  This is one of two files that know how to reach a model. The other is
  claude.js next door. Both are handed the same conversation and both return
  the same thing, so lib/advice.js can run its loop without knowing which one
  it is using.

  There is no SDK here, just fetch, which Node has built in from version 18.
  For one endpoint the SDK would be a dependency to install, update and explain,
  and the request below is short enough to read and to copy into a terminal when
  something goes wrong.

  What is different about Gemini, and why the translating below exists:

    it calls the two sides "user" and "model", where Claude says "assistant"
    the system prompt is its own field, systemInstruction, not a role
    tools are "functionDeclarations", and the schema uses UPPERCASE type names
    a tool result goes back as a functionResponse inside a user turn

  None of that changes what the app does. It is the same conversation in a
  different envelope.
*/

/*
  Where the API lives. v1beta is the version the free tier is served from.

  It can be pointed somewhere else, which the tests use to answer with a
  stand-in Gemini. That is worth having: the interesting thing to check is
  whether we build the request Google expects, and finding that out by spending
  real calls on a real key is a slow and expensive way to test a translation.
*/
const BASE_URL = process.env.GEMINI_BASE_URL
  || 'https://generativelanguage.googleapis.com/v1beta/models/';

/*
  Which model to use.

  gemini-3.6-flash is on the free tier and answered in about two seconds when
  this was tested. gemini-3.8-flash is newer but took ten seconds or more for a
  one word reply and often returned 503 "high demand", which is too slow for a
  coach that may call two or three tools per question. GEMINI_MODEL in
  backend/.env overrides this.
*/
export const DEFAULT_MODEL = 'gemini-3.6-flash';

// Tried in order when the chosen model is busy (503), over its free allowance
// (429) or gone (404). Each model has its own allowance, so the next one often
// works when the first is refused.
export const FALLBACK_MODELS = ['gemini-3.5-flash', 'gemini-3.5-flash-lite'];

// Statuses worth trying the next model for. Anything else, such as a bad key or
// a badly built request, would fail the same way on every model.
const TRY_NEXT_MODEL_ON = [404, 429, 500, 503, 504];

/*
  How much the model thinks before answering.

  Gemini 3 models think by default, and thinking tokens count against
  maxOutputTokens. In testing, a 400 token limit was used up by 381 tokens of
  thinking and the answer stopped mid-sentence. "low" keeps enough thinking to
  choose the right tool and leaves the budget for the answer.
*/
const THINKING_LEVEL = 'low';

/*
  Sent in place of a real thought signature when a tool call was written by a
  different model from the one now answering, which happens after a fallback.
  Google documents this value for that case. Tested: with no signature, or a
  made-up one, the request is refused with a 400; with this, it is accepted.
*/
const SKIP_SIGNATURE = 'skip_thought_signature_validator';


/*
  Turns our tool list into the shape Gemini wants.

  Two differences from the Claude shape, and both are easy to get wrong.

  The type names are uppercase. "object" is rejected, "OBJECT" is accepted.

  A tool that takes no arguments must have its parameters left out entirely.
  Sending an empty properties object is a validation error rather than a tool
  with no arguments, which is a confusing way to find out.
*/
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
  Turns our conversation into Gemini's "contents" list.

  The conversation is kept in a neutral shape by advice.js, with three kinds of
  entry, and each becomes something different here:

    a plain turn            -> parts: [{ text }]
    the model asking        -> parts: [{ functionCall }]
    us answering            -> parts: [{ functionResponse }]

  The model's own request has to go back exactly as it came, or the results
  after it have nothing to attach to.

  model is the one this request is about to be sent to. A signature only
  belongs to the model that wrote it, so a call written by another model gets
  SKIP_SIGNATURE instead.
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
      /*
        Results come back as a "user" turn, which reads oddly and is correct:
        as far as the model is concerned the answer arrived from outside.

        The output is wrapped in an object rather than sent as a bare string,
        because the field expects one.
      */
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


/*
  Reads one chunk of the streamed reply and hands each event on.

  Gemini streams Server-Sent Events, the same format this app's own API uses to
  talk to the browser: the word "data:", a line of JSON, then a blank line. A
  chunk from the network has nothing to do with where those events start and
  end, so completed events are taken out of a buffer and whatever is left over
  waits for the next chunk.
*/
function readEvents(buffer, onEvent) {
  /*
    Google ends each event with \r\n\r\n, not \n\n. The first version split
    on \n\n only, so no event was ever found and every real answer came back
    empty. The tests used a stand-in that sent \n\n, which is why they passed.
    Turning \r\n into \n first handles both.
  */
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


/*
  The models to try for one round, in order.

  Once a conversation has used a model it tries that one first, so the real
  thought signatures are used. If that model is busy the others are still
  tried; toGeminiContents then sends SKIP_SIGNATURE for calls it did not write.
*/
function modelsToTry(conversation) {
  const models = [];

  if (conversation && conversation.model) {
    models.push(conversation.model);
  }

  const chosen = process.env.GEMINI_MODEL || DEFAULT_MODEL;

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

    system        the instructions, as one string
    messages      the neutral conversation from advice.js
    tools         the tool list, in this app's own shape
    maxTokens     the ceiling for this round, thinking included
    onText        optional, called with each piece of the answer as it arrives
    conversation  optional object that lives for one whole question, so every
                  round of it uses the same model

  Returns { text, toolCalls, model, finishReason }. toolCalls is empty when the
  model has finished and is not asking for anything else, which is how the loop
  knows to stop.

  Throws on a refusal or a network failure, with a message meant to be shown.
*/
export async function runGeminiRound(options) {
  const apiKey = process.env.GEMINI_API_KEY;

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
    const url = BASE_URL + model + ':streamGenerateContent?alt=sse';

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
        /*
          Gemini gives a function call no id of its own, unlike Claude. The
          loop needs something to match a result back to its request, so one
          is made here from the position in the list.
        */
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
  if (process.env.GEMINI_API_KEY) {
    return true;
  }

  return false;
}
