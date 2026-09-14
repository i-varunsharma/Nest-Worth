import crypto from 'node:crypto';
import { log } from '../utils/logger.js';

/*
  Gives every request an id, times it, and logs the result.

  The id is also returned in the X-Request-Id header, so a bug report can name
  the exact request. The error handler prints the same id next to a stack trace.
*/

const ID_BYTES = 4;

export function requestLogger(req, res, next) {
  req.id = crypto.randomBytes(ID_BYTES).toString('hex');
  res.setHeader('X-Request-Id', req.id);

  const startedAt = Date.now();

  // 'finish' fires once the response is sent, when the status and time are known.
  res.on('finish', () => {
    const details = {
      id: req.id,
      status: res.statusCode,
      ms: Date.now() - startedAt,
    };

    if (req.user) {
      details.user = req.user.id;
    }

    // A 4xx is the API correctly refusing something, so it is a warning.
    // Only a 5xx is an error.
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
