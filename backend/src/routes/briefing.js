import express from 'express';
import { requireUser } from '../lib/sessions.js';
import { rateLimit } from '../lib/rateLimit.js';
import { briefingForToday } from '../lib/briefing.js';

/*
    GET /api/briefing   today's note, written if it does not exist yet

  There is no POST here on purpose. The note is not something anybody asks for;
  it is written the first time the dashboard is opened on a given day and read
  from the database for the rest of it.
*/

const router = express.Router();

/*
  A limit, even though the note is written once a day.

  The once-a-day part is a row in a table, and a row can be missing: a new
  account, a new day, or somebody clearing their own history. Every one of those
  is a request that reaches the model, so the route needs its own ceiling rather
  than relying on the cache to be one.
*/
const briefingLimit = rateLimit({
  limit: 60,
  windowMs: 60 * 60 * 1000,
});


router.get('/', requireUser, briefingLimit, async (req, res, next) => {
  try {
    const briefing = await briefingForToday(req.user.id);

    return res.json({ briefing: briefing });
  } catch (error) {
    /*
      An async route has to hand its errors to next() itself.

      Express catches a throw from an ordinary handler, but an async one returns
      a promise, and a rejected promise it never looked at is not a throw it can
      see. Without this the request would hang until the browser gave up.
    */
    return next(error);
  }
});


export default router;
