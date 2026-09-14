import { badRequest, notFound } from './errors.js';

/*
  Middleware that runs a check before the route handler.

    router.post('/', validateBody(checkDebt), handler)

  check(req.body) returns an error message or ''. A message becomes a 400.
*/
export function validateBody(check) {
  return function runCheck(req, res, next) {
    const message = check(req.body);

    if (message) {
      return next(badRequest(message));
    }

    return next();
  };
}


/*
  Like validateBody, but checks several named fields in order and says which
  one failed, so a form can show the message under the right input.

    validateFields({ email: checkEmail, password: checkPassword })
*/
export function validateFields(checks) {
  return function runChecks(req, res, next) {
    for (const field of Object.keys(checks)) {
      const message = checks[field](req.body[field]);

      if (message) {
        return next(badRequest(message, field));
      }
    }

    return next();
  };
}


/* The :id from an address as a positive whole number. Anything else is a 404. */
export function readId(req, notFoundMessage) {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    throw notFound(notFoundMessage);
  }

  return id;
}
