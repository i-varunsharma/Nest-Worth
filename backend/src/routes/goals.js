import { createRecordRouter } from './recordRoutes.js';
import { goalRepository } from '../repositories/goalRepository.js';
import { checkGoal, goalValues } from '../validation/records.js';

// /api/goals
export default createRecordRouter({
  repository: goalRepository,
  check: checkGoal,
  toValues: goalValues,
  singular: 'goal',
  plural: 'goals',
  notFoundMessage: 'No such goal.',
});
