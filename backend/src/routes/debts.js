import { createRecordRouter } from './recordRoutes.js';
import { debtRepository } from '../repositories/debtRepository.js';
import { checkDebt, debtValues } from '../validation/records.js';

// /api/debts
export default createRecordRouter({
  repository: debtRepository,
  check: checkDebt,
  toValues: debtValues,
  singular: 'debt',
  plural: 'debts',
  notFoundMessage: 'No such debt.',
});
