import express from 'express';
import { requireUser } from '../lib/sessions.js';
import { rateLimit } from '../lib/rateLimit.js';
import { MAX_HISTORY_TURNS, askClaude, checkQuestion, readFacts } from '../lib/advice.js';

/*
    POST /api/advice   ask the AI coach about my own money

  Body: { question, history }, both optional. Without a question the answer is
  "what should I do next", which is what the dashboard button asks for.

  This route does not answer the way the rest of the API does. Instead of one
  JSON object at the end, it holds the connection open and sends pieces as they
  arrive, because the answer is written a few words at a time and can take ten
  seconds when Claude runs a tool or two on the way.

  It is the only route in the app that costs money to answer, which is why it
  is the only one with a limit this tight.
*/

const router = express.Router();

// Twenty questions an hour is far more than a person asks and far fewer than a
// script would. The same limiter the OTP route uses, with its own numbers.
const askLimit = rateLimit({
  limit: 20,
  windowMs: 60 * 60 * 1000,
  message: 'That is a lot of questions in one hour. Try again a little later.',
});


/*
  Checks the earlier turns the browser sent back.

  The browser keeps the conversation, not the server, so it arrives with every
  question and none of it can be trusted. It is rebuilt here from scratch:
  anything that is not a plain user or assistant turn with text in it is
  dropped rather than corrected.

  Only the words are carried, never the tool results from earlier answers.
  Those were produced on this server, and a browser that could send its own
  would be a browser that could tell Claude any figure it liked and have it
  repeated back as fact.
*/
function cleanHistory(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }

  const clean = [];

  for (const turn of raw) {
    if (!turn || typeof turn !== 'object') {
      continue;
    }
    if (turn.role !== 'user' && turn.role !== 'assistant') {
      continue;
    }
    if (typeof turn.text !== 'string') {
      continue;
    }

    const text = turn.text.trim();

    if (text.length === 0) {
      continue;
    }

    // A single turn is capped too. Without it, a long conversation is a way to
    // send a very large prompt one message at a time.
    clean.push({ role: turn.role, text: text.slice(0, 2000) });
  }

  // Keep the most recent, since that is the part a follow-up refers to.
  if (clean.length > MAX_HISTORY_TURNS) {
    return clean.slice(clean.length - MAX_HISTORY_TURNS);
  }

  return clean;
}


router.post('/', requireUser, askLimit, async (req, res, next) => {
  try {
    let question = '';

    if (typeof req.body.question === 'string') {
      question = req.body.question.trim();
    }

    const problem = checkQuestion(question);

    if (problem) {
      return res.status(400).json({ error: problem, field: 'question' });
    }

    const facts = readFacts(req.user.id);

    // Somebody who skipped onboarding has no household row, so there is
    // nothing to reason about. Answering anyway would mean guessing.
    if (!facts.household) {
      return res.status(400).json({
        error: 'Answer the household questions first, then the coach has something to work with.',
      });
    }

    /*
      From here on the answer is streamed, so the status code is already 200
      and cannot be changed. Anything that could fail with a 400 had to be
      checked above.

      The three headers matter:
        text/event-stream  tells the browser this connection stays open
        no-cache           stops anything in between saving and replaying it
        keep-alive         stops it being closed after the first piece
    */
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    /*
      Sends one event.

      The format is Server-Sent Events, which is deliberately simple: the word
      "data:", the payload, then a blank line to mark the end. JSON goes on one
      line because a newline inside the payload would look like the end of the
      event.
    */
    const send = (event) => {
      // Writing to a response that has already finished throws, and there is
      // nobody left to read it anyway.
      if (res.writableEnded === true) {
        return;
      }

      res.write('data: ' + JSON.stringify(event) + '\n\n');
    };

    /*
      Stop as soon as the person navigates away or closes the tab.

      Without this the loop carries on calling Claude for an answer nobody will
      ever read, and every round of it is charged.

      This listens on the RESPONSE, not the request. Listening on the request
      looks like the obvious choice and is wrong: its 'close' fires as soon as
      the body has been read, which is before any of the work has happened, so
      every answer was treated as abandoned the moment it started. The symptom
      was a request that hung forever, because the code that ends the response
      was inside the "still here" branch.
    */
    let isGone = false;

    res.on('close', () => {
      isGone = true;
    });

    await askClaude(
      req.user.id,
      facts,
      cleanHistory(req.body.history),
      question,
      (event) => {
        if (isGone === true) {
          return;
        }
        send(event);
      },
    );

    if (isGone === false) {
      send({ type: 'done' });
      res.end();
    }
  } catch (error) {
    /*
      If the headers have gone out the answer is already streaming, and there
      is no status code left to change. All that can be done is say so in the
      stream and close it.
    */
    if (res.headersSent === true) {
      console.error('Advice stream failed:', error);
      res.write('data: ' + JSON.stringify({
        type: 'error',
        error: 'The answer stopped early. Please try again.',
      }) + '\n\n');
      return res.end();
    }

    // Nothing has been sent yet, so the normal error handler can deal with it.
    next(error);
  }
});


export default router;
