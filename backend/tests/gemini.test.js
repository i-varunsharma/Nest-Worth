import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

/*
  Tests for the Gemini side of the AI. Run with: npm test

  Nothing here talks to Google. A stand-in server answers instead, which is
  what GEMINI_BASE_URL is for.

  That is not a compromise, it is the point. The interesting thing to check is
  whether we build the request Google expects, and the way to find that out is
  to look at what we sent. Doing it against the real API would spend calls, need
  a key on every machine that runs the tests, and fail when the wifi does.

  Two of the checks below are for mistakes that are easy to make and produce
  confusing errors: Gemini rejects lowercase type names, and it rejects a tool
  whose parameters are an empty object rather than absent.
*/

process.env.GEMINI_API_KEY = 'fake-key-for-tests';
process.env.GEMINI_BASE_URL = 'http://localhost:4455/';

const { DEFAULT_MODEL, FALLBACK_MODELS, runGeminiRound, toGeminiContents, toGeminiTools } =
  await import('../src/ai/providers/gemini.js');

// Every request the stand-in received, so the tests can look at them.
const received = [];

// What the stand-in should answer with next.
let nextReply = { text: 'All good.' };

const server = http.createServer((req, res) => {
  let body = '';

  req.on('data', (chunk) => {
    body = body + chunk;
  });

  req.on('end', () => {
    // The model name is the part of the address before the colon.
    const model = req.url.split(':')[0].replace('/', '');

    received.push({ url: req.url, model: model, headers: req.headers, body: JSON.parse(body) });

    // Lets a test make one model busy while the others answer.
    if (nextReply.busyModels && nextReply.busyModels.includes(model)) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end('{"error":{"status":"UNAVAILABLE"}}');
      return;
    }

    if (nextReply.status && nextReply.status !== 200) {
      res.writeHead(nextReply.status, { 'Content-Type': 'application/json' });
      res.end(nextReply.body || '{}');
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/event-stream' });

    // Google ends each event with \r\n\r\n. A test can ask for \n\n instead.
    let ending = '\r\n\r\n';
    if (nextReply.ending !== undefined) {
      ending = nextReply.ending;
    }

    // What follows the final event. A test can leave it off.
    let lastEnding = ending;
    if (nextReply.lastEnding !== undefined) {
      lastEnding = nextReply.lastEnding;
    }

    const parts = [];

    if (nextReply.toolCall) {
      const callPart = { functionCall: { name: nextReply.toolCall, args: nextReply.args || {} } };

      if (nextReply.signature) {
        callPart.thoughtSignature = nextReply.signature;
      }

      parts.push(callPart);
    }

    if (nextReply.text) {
      // Split across two events, the way a real stream arrives.
      const half = Math.ceil(nextReply.text.length / 2);

      res.write('data: ' + JSON.stringify({
        candidates: [{ content: { role: 'model', parts: [{ text: nextReply.text.slice(0, half) }] } }],
      }) + ending);

      parts.push({ text: nextReply.text.slice(half) });
    }

    res.write('data: ' + JSON.stringify({
      candidates: [{ content: { role: 'model', parts: parts }, finishReason: 'STOP' }],
    }) + lastEnding);

    res.end();
  });
});

await new Promise((resolve) => {
  server.listen(4455, resolve);
});

test.after(() => {
  server.close();
});


const TOOLS = [
  {
    name: 'emergency_fund',
    description: 'Check how many months of cover they have.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'simulate_extra_payment',
    description: 'Work out what paying more does to one debt.',
    input_schema: {
      type: 'object',
      properties: {
        debt_name: { type: 'string', description: 'Which debt.' },
        extra_per_month: { type: 'number', description: 'Extra rupees a month.' },
      },
      required: ['debt_name', 'extra_per_month'],
    },
  },
];


// ---------------------------------------------------------------
// Translating the tools
// ---------------------------------------------------------------

test('tool types are uppercase, which is the only form Gemini accepts', () => {
  const [group] = toGeminiTools(TOOLS);
  const withArguments = group.functionDeclarations[1];

  assert.equal(withArguments.parameters.type, 'OBJECT');
  assert.equal(withArguments.parameters.properties.debt_name.type, 'STRING');
  assert.equal(withArguments.parameters.properties.extra_per_month.type, 'NUMBER');
});


test('a tool with no arguments has no parameters at all', () => {
  /*
    Sending "parameters": { type: OBJECT, properties: {} } is a validation
    error rather than a tool that takes nothing, and the message Google returns
    does not make that obvious.
  */
  const [group] = toGeminiTools(TOOLS);
  const noArguments = group.functionDeclarations[0];

  assert.equal(noArguments.name, 'emergency_fund');
  assert.equal('parameters' in noArguments, false);
});


test('the required list survives translation', () => {
  const [group] = toGeminiTools(TOOLS);

  assert.deepEqual(
    group.functionDeclarations[1].parameters.required,
    ['debt_name', 'extra_per_month'],
  );
});


// ---------------------------------------------------------------
// Translating the conversation
// ---------------------------------------------------------------

test('our two sides become Gemini’s two sides', () => {
  // Claude says "assistant" and Gemini says "model" for the same thing.
  const contents = toGeminiContents([
    { role: 'user', text: 'hello' },
    { role: 'assistant', text: 'hi' },
  ]);

  assert.equal(contents[0].role, 'user');
  assert.equal(contents[1].role, 'model');
  assert.equal(contents[1].parts[0].text, 'hi');
});


test('a tool request goes back as the model’s own turn', () => {
  const contents = toGeminiContents([
    { toolCalls: [{ id: 'c0', name: 'emergency_fund', input: {} }] },
  ]);

  assert.equal(contents[0].role, 'model');
  assert.equal(contents[0].parts[0].functionCall.name, 'emergency_fund');
});


test('a signed tool call is sent back with its signature', () => {
  // Newer Gemini models reject the next round if the signature goes missing.
  const contents = toGeminiContents([
    { toolCalls: [{ id: 'c0', name: 'emergency_fund', input: {}, signature: 'sig-123', model: 'model-a' }] },
  ], 'model-a');

  assert.equal(contents[0].parts[0].thoughtSignature, 'sig-123');
});


test('a call signed by a different model gets the skip value instead', () => {
  // After a fallback, the new model cannot check the old model's signature.
  // Tested against the real API: a foreign or missing signature is a 400.
  const contents = toGeminiContents([
    { toolCalls: [{ id: 'c0', name: 'emergency_fund', input: {}, signature: 'sig-123', model: 'model-a' }] },
  ], 'model-b');

  assert.equal(contents[0].parts[0].thoughtSignature, 'skip_thought_signature_validator');
});


test('a tool result goes back as a user turn, wrapped in an object', () => {
  /*
    It reads oddly and it is right: as far as the model is concerned the answer
    arrived from outside. The output has to be an object, not a bare string.
  */
  const contents = toGeminiContents([
    { toolResults: [{ id: 'c0', name: 'emergency_fund', output: '3 months' }] },
  ]);

  assert.equal(contents[0].role, 'user');
  assert.equal(contents[0].parts[0].functionResponse.name, 'emergency_fund');
  assert.deepEqual(contents[0].parts[0].functionResponse.response, { result: '3 months' });
});


// ---------------------------------------------------------------
// A real round against the stand-in
// ---------------------------------------------------------------

test('the answer is streamed piece by piece, not all at once', async () => {
  received.length = 0;
  nextReply = { text: 'You have enough put by.' };

  const pieces = [];

  const reply = await runGeminiRound({
    system: 'be helpful',
    messages: [{ role: 'user', text: 'am I safe?' }],
    tools: TOOLS,
    maxTokens: 500,
    onText: (piece) => {
      pieces.push(piece);
    },
  });

  // More than one piece means it really is arriving as it is written, which is
  // the whole reason the card does not just sit there for ten seconds.
  assert.ok(pieces.length > 1, 'the answer arrived in one lump');
  assert.equal(pieces.join(''), 'You have enough put by.');
  assert.equal(reply.text, 'You have enough put by.');
  assert.equal(reply.toolCalls.length, 0);
});


test('the request carries the key, the system prompt and the tools', async () => {
  received.length = 0;
  nextReply = { text: 'fine' };

  await runGeminiRound({
    system: 'you are the money coach',
    messages: [{ role: 'user', text: 'hello' }],
    tools: TOOLS,
    maxTokens: 700,
    onText: () => {},
  });

  const sent = received[0];

  // In a header, not the address, so it cannot end up in a logged URL.
  assert.equal(sent.headers['x-goog-api-key'], 'fake-key-for-tests');
  assert.equal(sent.url.includes('fake-key-for-tests'), false);
  assert.ok(sent.url.includes('alt=sse'), 'without alt=sse the reply is not a stream');

  // Low thinking, or the thinking uses up the token limit before the answer.
  assert.equal(sent.body.generationConfig.thinkingConfig.thinkingLevel, 'low');
  assert.equal(sent.body.systemInstruction.parts[0].text, 'you are the money coach');
  assert.equal(sent.body.generationConfig.maxOutputTokens, 700);
  assert.equal(sent.body.tools[0].functionDeclarations.length, 2);
});


test('a tool call comes back with something to match its result to', async () => {
  /*
    Gemini gives a function call no id of its own, where Claude does. The loop
    needs one to pair a result with its request, so gemini.js makes one up.
  */
  received.length = 0;
  nextReply = {
    toolCall: 'simulate_extra_payment',
    args: { debt_name: 'Card', extra_per_month: 3000 },
    signature: 'sig-abc',
  };

  const reply = await runGeminiRound({
    system: 'be helpful',
    messages: [{ role: 'user', text: 'what if I paid more?' }],
    tools: TOOLS,
    maxTokens: 500,
    onText: () => {},
  });

  assert.equal(reply.toolCalls.length, 1);
  assert.ok(reply.toolCalls[0].id, 'a tool call with no id cannot be answered');
  assert.equal(reply.toolCalls[0].name, 'simulate_extra_payment');
  assert.deepEqual(reply.toolCalls[0].input, { debt_name: 'Card', extra_per_month: 3000 });
  assert.equal(reply.toolCalls[0].signature, 'sig-abc');
});


test('a wrong key is reported as a wrong key, not as a crash', async () => {
  received.length = 0;
  nextReply = { status: 400, body: JSON.stringify({ error: { message: 'API key not valid' } }) };

  await assert.rejects(
    () => runGeminiRound({
      system: 'x', messages: [{ role: 'user', text: 'y' }],
      tools: [], maxTokens: 100, onText: () => {},
    }),
    /GEMINI_API_KEY/,
  );
});


test('a model name Google has retired says so, and where to look', async () => {
  received.length = 0;
  nextReply = { status: 404, body: '{}' };

  await assert.rejects(
    () => runGeminiRound({
      system: 'x', messages: [{ role: 'user', text: 'y' }],
      tools: [], maxTokens: 100, onText: () => {},
    }),
    /GEMINI_MODEL/,
  );
});


test('a used-up free allowance is reported plainly', async () => {
  received.length = 0;
  nextReply = { status: 429, body: '{}' };

  await assert.rejects(
    () => runGeminiRound({
      system: 'x', messages: [{ role: 'user', text: 'y' }],
      tools: [], maxTokens: 100, onText: () => {},
    }),
    /allowance/,
  );
});


// ---------------------------------------------------------------
// Things only the real API showed
// ---------------------------------------------------------------

test('regression: events ending in \\r\\n\\r\\n are read', async () => {
  /*
    Google separates stream events with \r\n\r\n. The reader used to split on
    \n\n only, so it found no events and every real answer was empty, while
    these tests passed against a stand-in that sent \n\n.
  */
  received.length = 0;
  nextReply = { text: 'Clear the card first.', ending: '\r\n\r\n' };

  const reply = await runGeminiRound({
    system: 'x', messages: [{ role: 'user', text: 'y' }], tools: [], maxTokens: 100,
  });

  assert.equal(reply.text, 'Clear the card first.');
  assert.equal(reply.finishReason, 'STOP');
});


test('events ending in plain \\n\\n are still read', async () => {
  received.length = 0;
  nextReply = { text: 'Still fine.', ending: '\n\n' };

  const reply = await runGeminiRound({
    system: 'x', messages: [{ role: 'user', text: 'y' }], tools: [], maxTokens: 100,
  });

  assert.equal(reply.text, 'Still fine.');
});


test('the last event is read even with no blank line after it', async () => {
  received.length = 0;
  nextReply = { text: 'Last words.', lastEnding: '' };

  const reply = await runGeminiRound({
    system: 'x', messages: [{ role: 'user', text: 'y' }], tools: [], maxTokens: 100,
  });

  assert.equal(reply.text, 'Last words.');
});


test('regression: a round with no onText does not crash', async () => {
  // The daily briefing passes no onText. It used to throw, and the briefing
  // quietly fell back to the plain findings every time.
  received.length = 0;
  nextReply = { text: 'A short note.' };

  const reply = await runGeminiRound({
    system: 'x', messages: [{ role: 'user', text: 'y' }], tools: [], maxTokens: 100,
  });

  assert.equal(reply.text, 'A short note.');
});


test('a busy model falls back to the next one, and the question remembers it', async () => {
  received.length = 0;
  nextReply = { text: 'Answered by the fallback.', busyModels: [DEFAULT_MODEL] };

  const conversation = {};

  const reply = await runGeminiRound({
    system: 'x', messages: [{ role: 'user', text: 'y' }], tools: [], maxTokens: 100,
    conversation: conversation,
  });

  assert.equal(reply.text, 'Answered by the fallback.');
  assert.equal(received[0].model, DEFAULT_MODEL);
  assert.equal(received[1].model, FALLBACK_MODELS[0]);
  assert.equal(conversation.model, FALLBACK_MODELS[0]);
});


test('a tool call records which model signed it', async () => {
  received.length = 0;
  nextReply = { toolCall: 'emergency_fund', signature: 'sig-xyz' };

  const reply = await runGeminiRound({
    system: 'x', messages: [{ role: 'user', text: 'y' }], tools: TOOLS, maxTokens: 100,
  });

  assert.equal(reply.toolCalls[0].signature, 'sig-xyz');
  assert.equal(reply.toolCalls[0].model, DEFAULT_MODEL);
});


test('when every model is busy the message says so plainly', async () => {
  received.length = 0;
  nextReply = { status: 503, body: '{}' };

  await assert.rejects(
    () => runGeminiRound({
      system: 'x', messages: [{ role: 'user', text: 'y' }], tools: [], maxTokens: 100,
    }),
    /busy/,
  );

  // Every model was tried before giving up.
  assert.equal(received.length, 1 + FALLBACK_MODELS.length);
});
