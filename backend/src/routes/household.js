import express from 'express';
import { requireUser } from '../middleware/auth.js';
import { badRequest } from '../http/errors.js';
import { validateBody, validateFields } from '../http/validate.js';
import { householdRepository } from '../repositories/householdRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import { checkName } from '../validation/accountFields.js';
import { checkHousehold, checkPlanChoice, householdValues } from '../validation/householdFields.js';

/*
    GET /api/household        the onboarding answers
    PUT /api/household        save them
    PUT /api/household/plan   choose a plan from /plans, or null for the recommended one
    PUT /api/household/name   set a name, for accounts made with a phone code
*/

const router = express.Router();
router.use(requireUser);

// Shown before onboarding is finished.
const DEFAULTS = {
  income: 62000,
  dependents: 2,
  hasLoan: true,
  incomeVaries: false,
  essentialCosts: 0,
  chosenPlan: null,
};

// isSaved tells the browser whether to show the dashboard or onboarding.
function householdResponse(household) {
  if (household === null) {
    return { household: { ...DEFAULTS, isSaved: false } };
  }

  return { household: { ...household, isSaved: true } };
}


router.get('/', (req, res) => {
  res.json(householdResponse(householdRepository.find(req.user.id)));
});


router.put('/', validateBody(checkHousehold), (req, res) => {
  const saved = householdRepository.save(req.user.id, householdValues(req.body));
  res.json(householdResponse(saved));
});


router.put('/plan', validateFields({ plan: checkPlanChoice }), (req, res) => {
  const saved = householdRepository.choosePlan(req.user.id, req.body.plan);

  if (saved === null) {
    throw badRequest('Answer the household questions first, then you can choose a plan.');
  }

  res.json(householdResponse(saved));
});


router.put('/name', validateFields({ name: checkName }), (req, res) => {
  const name = req.body.name.trim();

  userRepository.setName(req.user.id, name);
  res.json({ name: name });
});


export default router;
