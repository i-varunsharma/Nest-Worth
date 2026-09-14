import { AppError, errorBody } from './errors.js';
import { log, safeForLogging } from '../utils/logger.js';

/*
  The last two pieces of middleware in app.js.

  Express 5 sends anything thrown in a route, including a rejected promise from
  an async route, to the error handler. So routes and services throw, and this
  is the only place that turns errors into responses.
*/


/* Any request that matched no route. */
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'No such endpoint: ' + req.method + ' ' + req.path,
    code: 'not_found',
  });
}


/*
  The error handler.

  Express recognises error middleware by its four arguments, so _next has to
  stay even though it is unused.
*/
export function errorHandler(error, req, res, _next) {
  if (error instanceof AppError) {
    if (error.status === 429 && error.extra.retryAfterSeconds) {
      res.set('Retry-After', String(error.extra.retryAfterSeconds));
    }

    return res.status(error.status).json(errorBody(error));
  }

  // express.json() throws these for a body it cannot read. They are the
  // caller's mistake, not ours, so they must not become a 500.
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'The request body is not valid JSON.', code: 'invalid_json' });
  }

  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'That request is too large.', code: 'too_large' });
  }

  // Anything else is a bug. The details go to the log, never to the browser,
  // and the request id lets a bug report point at the exact log line.
  log('error', 'Unhandled error', {
    id: req.id,
    path: req.originalUrl,
    message: error.message,
    body: JSON.stringify(safeForLogging(req.body)),
  });

  console.error(error);

  return res.status(500).json({
    error: 'Something went wrong on our side.',
    code: 'internal_error',
    requestId: req.id,
  });
}
