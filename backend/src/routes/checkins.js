import express from 'express';
import { requireUser } from '../middleware/auth.js';
import { validateBody } from '../http/validate.js';
import { checkinRepository } from '../repositories/checkinRepository.js';
import { checkCheckin, checkinValues } from '../validation/records.js';

/*
    GET  /api/checkins   the last two years, newest first
    POST /api/checkins   record a month, or update it if it exists
*/

const router = express.Router();
router.use(requireUser);

const MONTHS_TO_RETURN = 24;

router.get('/', (req, res) => {
  res.json({ checkins: checkinRepository.listRecent(req.user.id, MONTHS_TO_RETURN) });
});

router.post('/', validateBody(checkCheckin), (req, res) => {
  res.json({ checkin: checkinRepository.save(req.user.id, checkinValues(req.body)) });
});

export default router;
