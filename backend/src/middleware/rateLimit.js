import { config } from '../config.js';
import { errorBody, tooManyRequests } from '../http/errors.js';

/*
  Refuses a caller who asks too often, which is what stops a script guessing
  passwords as fast as the network allows.

  A fixed window: count requests per caller, and refuse past the limit until the
  window ends. Counts live in this process's memory, so they reset on restart
  and are not shared between servers. Redis would be the fix for more than one
  server.

    router.post('/login', rateLimit({ limit: 10, windowMs: 15 * 60 * 1000 }), handler)
*/

// Old windows are swept out at most this often, so the map cannot grow forever.
const CLEANUP_EVERY_MS = 10 * 60 * 1000;

const DEFAULT_MESSAGE = 'Too many attempts. Please wait a little and try again.';


/* A signed-in caller is counted by user id, anyone else by IP address. */
function callerKey(req) {
  if (req.user) {
    return 'user:' + req.user.id;
  }

  return 'ip:' + req.ip;
}


export function rateLimit(options) {
  const limit = options.limit;
  const windowMs = options.windowMs;

  let message = DEFAULT_MESSAGE;
  if (typeof options.message === 'string') {
    message = options.message;
  }

  // callerKey -> { windowStart, count }
  const hits = new Map();
  let lastCleanup = Date.now();

  function removeExpiredWindows(now) {
    for (const [key, record] of hits) {
      if (now - record.windowStart > windowMs) {
        hits.delete(key);
      }
    }

    lastCleanup = now;
  }

  return function checkLimit(req, res, next) {
    // Read on every request, so the test suite can switch it off.
    if (config.isRateLimitDisabled === true) {
      return next();
    }

    const now = Date.now();

    if (now - lastCleanup > CLEANUP_EVERY_MS) {
      removeExpiredWindows(now);
    }

    const key = callerKey(req);
    const record = hits.get(key);

    if (!record || now - record.windowStart > windowMs) {
      hits.set(key, { windowStart: now, count: 1 });
      return next();
    }

    record.count = record.count + 1;

    if (record.count <= limit) {
      return next();
    }

    // Answered here rather than passed to next(error), so the limiter works
    // on its own in tests/rateLimit.test.js without the error handler.
    const secondsLeft = Math.ceil((record.windowStart + windowMs - now) / 1000);

    res.set('Retry-After', String(secondsLeft));
    return res.status(429).json(errorBody(tooManyRequests(message, secondsLeft)));
  };
}
