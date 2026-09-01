import express from 'express';
import { requireUser } from '../lib/sessions.js';
import { buildInsights } from '../lib/insights.js';

/*
    GET /api/insights   everything the database can tell you about your own money

  This is the reporting endpoint. Unlike the others it stores nothing and
  changes nothing: it asks the database five questions and returns the answers.

  It exists because the rest of the API hands out rows and lets the browser do
  the adding up. That is the right call when the browser needs every row anyway,
  which is what the debts and goals pages do. It is the wrong call for an
  average, a running total or a share, where the answer is one number and the
  rows are only the raw material. Those belong in SQL, and lib/insights.js is
  where they live.
*/

const router = express.Router();


router.get('/', requireUser, (req, res) => {
  /*
    The user id comes from the session cookie, never from the URL or the query
    string. There is deliberately no /api/insights/:userId, because the moment
    an id is something the caller can type, it is something the caller can
    change, and every one of these queries would need its own check.
  */
  const insights = buildInsights(req.user.id);

  return res.json({ insights: insights });
});


export default router;
