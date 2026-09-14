import express from 'express';
import { requireUser } from '../middleware/auth.js';
import { buildInsights } from '../reports/insights.js';

// GET /api/insights  averages, running totals and groupings, worked out in SQL.
const router = express.Router();

router.get('/', requireUser, (req, res) => {
  res.json({ insights: buildInsights(req.user.id) });
});

export default router;
