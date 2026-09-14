import express from 'express';
import { requireUser } from '../middleware/auth.js';
import { badRequest, notFound } from '../http/errors.js';
import { readId, validateBody } from '../http/validate.js';

/*
  The four routes every list of personal records has:

    GET    /       list mine
    POST   /       add one
    PUT    /:id    change one
    DELETE /:id    remove one

  Debts, goals, assets and family members all use this, so they behave the same
  way and the ownership rule cannot be missed on one of them. The repository
  filters every query on the signed-in user's id; this file never takes a user
  id from the request.

  options:
    repository       one built with createOwnedRecordRepository
    check            returns an error message for a bad body, or ''
    toValues         turns a checked body into the values to store
    singular, plural the JSON keys, such as 'debt' and 'debts'
    notFoundMessage  shown when the id does not belong to this user
    maxRecords       optional cap on how many one account can have
*/
export function createRecordRouter(options) {
  const repository = options.repository;
  const router = express.Router();

  router.use(requireUser);

  router.get('/', (req, res) => {
    const body = {};
    body[options.plural] = repository.list(req.user.id);

    res.json(body);
  });

  router.post('/', validateBody(options.check), (req, res) => {
    if (options.maxRecords && repository.count(req.user.id) >= options.maxRecords) {
      throw badRequest('That is as many as one account can list.');
    }

    const body = {};
    body[options.singular] = repository.create(req.user.id, options.toValues(req.body));

    res.status(201).json(body);
  });

  router.put('/:id', validateBody(options.check), (req, res) => {
    const id = readId(req, options.notFoundMessage);
    const updated = repository.update(req.user.id, id, options.toValues(req.body));

    if (updated === null) {
      throw notFound(options.notFoundMessage);
    }

    const body = {};
    body[options.singular] = updated;

    res.json(body);
  });

  router.delete('/:id', (req, res) => {
    const id = readId(req, options.notFoundMessage);

    if (repository.remove(req.user.id, id) === false) {
      throw notFound(options.notFoundMessage);
    }

    res.json({ ok: true });
  });

  return router;
}
