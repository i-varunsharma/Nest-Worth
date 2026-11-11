import express from 'express';
import { requireUser } from '../middleware/auth.js';
import { briefingLimit } from '../middleware/limits.js';
import { briefingForToday } from '../services/briefingService.js';

// GET /api/briefing  today's dashboard note, written on the first request of the day.
const router = express.Router();

router.get('/', requireUser, briefingLimit, async (req, res) => {
  res.json({ briefing: await briefingForToday(req.user.id) });
});

export default router;
