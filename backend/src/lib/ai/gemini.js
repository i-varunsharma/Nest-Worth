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

  Flash is the small, fast one, and it is the one the free tier covers. Google
  renames these fairly often, so it is a setting rather than a constant: if the
  name below stops working the error further down says exactly where to look.
*/
const DEFAULT_MODEL = 'gemini-2.0-flash';


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
*/
export function toGeminiContents(messages) {
  return messages.map((entry) => {
    if (entry.toolCalls) {
      return {
        role: 'model',
        parts: entry.toolCalls.map((call) => {
          return { functionCall: { name: call.name, args: call.input } };
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
  const pieces = buffer.split('\n\n');

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
  One round of the conversation.

    system     the instructions, as one string
    messages   the neutral conversation from advice.js
    tools      the tool list, in this app's own shape
    maxTokens  the ceiling for this round
    onText     called with each piece of the answer as it is written

  Returns { text, toolCalls }. toolCalls is empty when the model has finished
  and is not asking for anything else, which is how the loop knows to stop.

  Throws on a refusal or a network failure, with a message meant to be shown.
*/
export async function runGeminiRound(options) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  const url = BASE_URL + model + ':streamGenerateContent?alt=sse&key=' + encodeURIComponent(apiKey);

  const body = {
    systemInstruction: { parts: [{ text: options.system }] },
    contents: toGeminiContents(options.messages),
    generationConfig: { maxOutputTokens: options.maxTokens },
  };

  // A request with an empty tool list is rejected, so it is left out entirely.
  if (options.tools.length > 0) {
    body.tools = toGeminiTools(options.tools);
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text();

    console.error('Gemini refused the request:', response.status, detail);

    if (response.status === 400 && detail.includes('API key not valid')) {
      throw new Error('That Gemini API key was refused. Check GEMINI_API_KEY in backend/.env.');
    }

    if (response.status === 404) {
      throw new Error(
        'Gemini has no model called "' + model + '". Google renames these; '
        + 'pick a current one from ai.google.dev and set GEMINI_MODEL in backend/.env.',
      );
    }

    if (response.status === 429) {
      throw new Error('The free Gemini allowance is used up for now. Try again in a minute.');
    }

    throw new Error('Gemini would not answer. Please try again.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let buffer = '';
  let text = '';
  const toolCalls = [];

  while (true) {
    const chunk = await reader.read();

    if (chunk.done === true) {
      break;
    }

    buffer = buffer + decoder.decode(chunk.value, { stream: true });

    buffer = readEvents(buffer, (event) => {
      if (!event.candidates || event.candidates.length === 0) {
        return;
      }

      const candidate = event.candidates[0];

      if (!candidate.content || !candidate.content.parts) {
        return;
      }

      candidate.content.parts.forEach((part) => {
        if (typeof part.text === 'string' && part.text.length > 0) {
          text = text + part.text;
          options.onText(part.text);
          return;
        }

        if (part.functionCall) {
          /*
            Gemini gives a function call no id of its own, unlike Claude. The
            loop needs something to match a result back to its request, so one
            is made here from the position in the list.
          */
          toolCalls.push({
            id: 'call_' + toolCalls.length,
            name: part.functionCall.name,
            input: part.functionCall.args || {},
          });
        }
      });
    });
  }

  return { text: text, toolCalls: toolCalls };
}


/* Whether this provider is set up. Used to pick one in ai/index.js. */
export function isGeminiConfigured() {
  if (process.env.GEMINI_API_KEY) {
    return true;
  }

  return false;
}
