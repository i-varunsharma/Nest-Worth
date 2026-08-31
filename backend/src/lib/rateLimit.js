/*
  Refuses requests from anyone asking far too often.

  A password is checked by asking this server, and nothing stops a script
  asking a few hundred times a second with a different guess each time. Password
  rules cannot prevent that. Refusing to keep answering can.

  For each caller we remember when their current window started and how many
  requests they have made in it. Past the limit, everything is refused until the
  window runs out. This is a "fixed window" limiter, the simplest kind that
  works. Its known weakness is that someone can use a full allowance at the end
  of one window and another at the start of the next, so a short burst of double
  the limit is possible. That does not matter for stopping password guessing.

  The counts live in this server's memory, which has two consequences: a restart
  forgets them, and two copies of the server behind a load balancer would count
  separately. Both are fine at this size. The usual fix is to keep the counts in
  Redis so every copy shares them.
*/

// How often to drop expired entries, so the Map cannot grow forever.
const CLEANUP_EVERY_MS = 10 * 60 * 1000;

/*
  An off switch for the tests, which make dozens of accounts in a couple of
  seconds from one address and would otherwise be refused. It is off unless
  somebody deliberately sets it, so a real server gets the limits by default.

  The limiter is still tested, in tests/rateLimit.test.js, which calls it
  directly instead of over HTTP.
*/
const isDisabled = process.env.DISABLE_RATE_LIMIT === 'true';

/*
  Works out who is asking.

  A signed-in person is counted by their user id, which does not change when
  they move between wifi and mobile data. Everyone else is counted by IP
  address, the only thing available before somebody signs in.

  IP address is a rough identifier: a whole office can share one. That is why
  the limits below are generous enough for a real person and still far too tight
  for a script.
*/
function identify(req) {
  if (req.user) {
    return 'user:' + req.user.id;
  }

  return 'ip:' + req.ip;
}

/*
  Returns a piece of middleware allowing `limit` requests every `windowMs`:

      router.post('/login', rateLimit({ limit: 10, windowMs: 60000 }), handler);

  The outer call runs once at startup and sets the rules. The function it
  returns is what runs on every request, which is how each route gets its own
  limit.
*/
export function rateLimit(options) {
  const limit = options.limit;
  const windowMs = options.windowMs;

  let message = 'Too many attempts. Please wait a little and try again.';
  if (typeof options.message === 'string') {
    message = options.message;
  }

  // "ip:1.2.3.4" -> { windowStart, count }. Each limiter gets its own Map, so
  // the login limit and the signup limit cannot interfere with each other.
  const hits = new Map();

  let lastCleanup = Date.now();

  return function checkLimit(req, res, next) {
    if (isDisabled === true) {
      return next();
    }

    const now = Date.now();

    // Drop entries whose window has passed. Without this we keep one entry
    // forever for every address that ever called the server.
    if (now - lastCleanup > CLEANUP_EVERY_MS) {
      for (const [key, record] of hits) {
        if (now - record.windowStart > windowMs) {
          hits.delete(key);
        }
      }
      lastCleanup = now;
    }

    const key = identify(req);
    const existing = hits.get(key);

    // Either their first request, or their old window has run out. Start a
    // fresh window at one request.
    let isNewWindow = false;

    if (!existing) {
      isNewWindow = true;
    } else if (now - existing.windowStart > windowMs) {
      isNewWindow = true;
    }

    if (isNewWindow === true) {
      hits.set(key, { windowStart: now, count: 1 });
      return next();
    }

    existing.count = existing.count + 1;

    if (existing.count > limit) {
      const secondsLeft = Math.ceil((existing.windowStart + windowMs - now) / 1000);

      // The standard header for telling a client how long to wait.
      res.set('Retry-After', String(secondsLeft));

      // 429 means exactly "too many requests".
      return res.status(429).json({
        error: message,
        retryAfterSeconds: secondsLeft,
      });
    }

    return next();
  };
}
