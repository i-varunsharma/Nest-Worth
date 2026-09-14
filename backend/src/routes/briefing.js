import express from 'express';
import { requireUser } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { briefingForToday } from '../services/briefingService.js';

// GET /api/briefing  today's dashboard note, written on the first request of the day.
const router = express.Router();

// The note is stored once a day, but a new account or a new day reaches the
// model, so the route still needs a ceiling of its own.
const briefingLimit = rateLimit({ limit: 60, windowMs: 60 * 60 * 1000 });

router.get('/', requireUser, briefingLimit, async (req, res) => {
  res.json({ briefing: await briefingForToday(req.user.id) });
});

export default router;
