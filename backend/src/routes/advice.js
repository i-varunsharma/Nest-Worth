import express from 'express';
import { requireUser } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { badRequest } from '../http/errors.js';
import { MAX_HISTORY_TURNS, askCoach, checkQuestion } from '../ai/advice.js';
import { readFacts } from '../ai/facts.js';

/*
    POST /api/advice   ask the AI coach about my own money

  Body: { question, history }, both optional. The answer is streamed as
  Server-Sent Events, because a question that runs tools can take several
  seconds: each event is "data: <json>" followed by a blank line.

    { type: 'text', text }     part of the answer
    { type: 'tool', label }    a calculation started
    { type: 'error', error }   something went wrong
    { type: 'done' }           finished
*/

const router = express.Router();

// The only route that costs money per request.
const askLimit = rateLimit({
  limit: 20,
  windowMs: 60 * 60 * 1000,
  message: 'That is a lot of questions in one hour. Try again a little later.',
});

const MAX_TURN_LENGTH = 2000;


/*
  The browser keeps the conversation and sends it back each time, so none of it
  can be trusted. It is rebuilt with only plain user and assistant text. Tool
  results are never accepted from the browser, or a browser could feed the model
  any figure it liked.
*/
function cleanHistory(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }

  const clean = [];

  for (const turn of raw) {
    if (!turn || (turn.role !== 'user' && turn.role !== 'assistant') || typeof turn.text !== 'string') {
      continue;
    }

    const text = turn.text.trim();

    if (text.length > 0) {
      clean.push({ role: turn.role, text: text.slice(0, MAX_TURN_LENGTH) });
    }
  }

  // Keep the most recent turns, which are the ones a follow-up refers to.
  return clean.slice(Math.max(clean.length - MAX_HISTORY_TURNS, 0));
}


router.post('/', requireUser, askLimit, async (req, res) => {
  let question = '';
  if (typeof req.body.question === 'string') {
    question = req.body.question.trim();
  }

  const problem = checkQuestion(question);
  if (problem) {
    throw badRequest(problem, 'question');
  }

  const facts = readFacts(req.user.id);
  if (!facts.household) {
    throw badRequest('Answer the household questions first, then the coach has something to work with.');
  }

  // From here the status is 200 and cannot change, so everything that could be
  // a 400 was checked above.
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Stop sending once the browser has gone. This listens on the response: the
  // request's 'close' fires as soon as its body is read, before any work.
  let isGone = false;
  res.on('close', () => {
    isGone = true;
  });

  const send = (event) => {
    if (isGone === false && res.writableEnded === false) {
      res.write('data: ' + JSON.stringify(event) + '\n\n');
    }
  };

  try {
    await askCoach(req.user.id, facts, cleanHistory(req.body.history), question, send);
  } catch (error) {
    console.error('Advice stream failed:', error);
    send({ type: 'error', error: 'The answer stopped early. Please try again.' });
  }

  send({ type: 'done' });
  res.end();
});


export default router;
