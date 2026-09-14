/*
  The one error type the API throws on purpose.

  Routes and services throw an AppError when a request cannot be completed, and
  http/errorHandler.js turns it into a response. That keeps every error body the
  same shape:

    { error: 'A sentence to show the person', code: 'not_found', field: 'email' }

  "field" is set when one form input caused the problem, so the page can show
  the message under that input. The browser reacts to "code", never to the text.

  Anything thrown that is not an AppError is a bug, and becomes a 500.
*/
export class AppError extends Error {
  constructor(status, message, options) {
    super(message);

    this.name = 'AppError';
    this.status = status;
    this.code = 'error';
    this.field = null;
    this.extra = {};

    if (options && options.code) {
      this.code = options.code;
    }
    if (options && options.field) {
      this.field = options.field;
    }
    if (options && options.extra) {
      this.extra = options.extra;
    }
  }
}


// Helpers for the statuses this API uses, so a route reads as what went wrong.

export function badRequest(message, field) {
  return new AppError(400, message, { code: 'invalid_request', field: field });
}

export function unauthorized(message, field) {
  return new AppError(401, message, { code: 'unauthorized', field: field });
}

// Separate from unauthorized: the browser sends somebody to the login page for
// this one, but not for a wrong password.
export function noSession() {
  return new AppError(401, 'Please sign in first.', { code: 'no_session' });
}

export function notFound(message) {
  return new AppError(404, message, { code: 'not_found' });
}

export function conflict(message, field) {
  return new AppError(409, message, { code: 'conflict', field: field });
}

export function tooManyRequests(message, retryAfterSeconds, field) {
  return new AppError(429, message, {
    code: 'rate_limited',
    field: field,
    extra: { retryAfterSeconds: retryAfterSeconds },
  });
}

export function notConfigured(message) {
  return new AppError(501, message, { code: 'not_configured' });
}

export function upstreamFailed(message) {
  return new AppError(502, message, { code: 'upstream_failed' });
}


/* The JSON body for an AppError. Used by the error handler and the rate limiter. */
export function errorBody(error) {
  const body = { error: error.message, code: error.code };

  if (error.field) {
    body.field = error.field;
  }

  for (const key of Object.keys(error.extra)) {
    if (error.extra[key] !== undefined) {
      body[key] = error.extra[key];
    }
  }

  return body;
}
