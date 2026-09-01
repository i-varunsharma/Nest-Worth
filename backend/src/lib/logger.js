import crypto from 'node:crypto';

/*
  A record of what the API did.

  Until this existed there was none. If somebody said "it broke around four
  o'clock", there was nothing to look at: no list of requests, no timings, no
  way to tell a slow endpoint from a broken one. Every backend has this, and it
  is the first thing you reach for when something is wrong in a place you cannot
  reproduce.

  Two ideas, and the second is the one worth understanding.

  Every request gets an id. One request can produce several lines of output, and
  several requests can be in flight at once, so without an id the lines
  interleave and there is no way to tell which belongs to which. With one, you
  can pull every line for a single request out of a day of logs.

  The id also goes back to the browser in an X-Request-Id header. That closes
  the loop: a person reporting a problem can give you that id, or the frontend
  can print it, and you can find the exact request rather than guessing from a
  timestamp.

  Lines are JSON rather than sentences. A sentence is nicer to read on a laptop
  and useless to a machine: JSON can be searched, filtered and counted by every
  log tool there is. In development that is a bit dense to read, so the pretty
  format below is used when NODE_ENV is not production.
*/

// Long enough not to collide, short enough to read out over a phone.
const ID_LENGTH = 8;

const isProduction = process.env.NODE_ENV === 'production';

/*
  Never log these, whatever happens.

  A log file is the easiest place in a system to leak a secret, because nobody
  thinks of it as storage. It gets copied into tickets, pasted into chats and
  kept far longer than any database row.
*/
const NEVER_LOG = ['password', 'newPassword', 'currentPassword', 'token', 'credential', 'code'];


/* A short random id for one request. */
function makeRequestId() {
  return crypto.randomBytes(ID_LENGTH / 2).toString('hex');
}


/*
  Writes one line.

  Everything goes through here so the shape is the same everywhere, and so
  switching to a real log service later is one change rather than fifty.
*/
export function log(level, message, details) {
  const entry = {
    time: new Date().toISOString(),
    level: level,
    message: message,
  };

  if (details) {
    Object.assign(entry, details);
  }

  if (isProduction === true) {
    console.log(JSON.stringify(entry));
    return;
  }

  // Development: something a person can read at a glance.
  let line = '  ' + level.padEnd(5) + ' ' + message;

  if (details) {
    const parts = [];

    for (const key of Object.keys(details)) {
      parts.push(key + '=' + details[key]);
    }

    if (parts.length > 0) {
      line = line + '  ' + parts.join(' ');
    }
  }

  console.log(line);
}


/*
  Removes anything secret from an object before it is logged.

  Used for the bodies of failed requests, which are genuinely useful to see when
  a validation rule is rejecting something it should not. A signup body is also
  where a plain-text password lives, so it cannot simply be printed.
*/
export function safeForLogging(body) {
  if (!body || typeof body !== 'object') {
    return {};
  }

  const safe = {};

  for (const key of Object.keys(body)) {
    if (NEVER_LOG.includes(key)) {
      safe[key] = '[hidden]';
    } else {
      safe[key] = body[key];
    }
  }

  return safe;
}


/*
  Middleware. Gives every request an id, times it, and logs the result.

  The timing is the point. An endpoint that is merely slow never throws, so it
  never appears anywhere, and it is invisible until somebody complains. A
  duration on every line makes it obvious.

  res.on('finish') is what waits for the answer. It fires once the response has
  been sent, which is the only moment the status and the duration are both
  known. Doing this at the top of the request would log an outcome that has not
  happened yet.
*/
export function requestLogger(req, res, next) {
  req.id = makeRequestId();

  // So the browser, and anybody reporting a problem, can name this request.
  res.setHeader('X-Request-Id', req.id);

  const startedAt = Date.now();

  res.on('finish', () => {
    const details = {
      id: req.id,
      status: res.statusCode,
      ms: Date.now() - startedAt,
    };

    // Who it was, when there is a session. Never the email or the name: a log
    // is not the place for anything identifying.
    if (req.user) {
      details.user = req.user.id;
    }

    /*
      The level says how much attention the line deserves.

      A 4xx is the API refusing something, which is it working correctly, so it
      is a warning rather than an error. A 5xx is the API failing, which is the
      only thing here that deserves the word error.
    */
    let level = 'info';

    if (res.statusCode >= 500) {
      level = 'error';
    } else if (res.statusCode >= 400) {
      level = 'warn';
    }

    log(level, req.method + ' ' + req.originalUrl, details);
  });

  next();
}
