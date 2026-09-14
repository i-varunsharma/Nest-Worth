import { createOwnedRecordRepository } from './ownedRecordRepository.js';

// What is being saved for. Soonest deadline first.
export const goalRepository = createOwnedRecordRepository({
  table: 'goals',
  fields: {
    name: 'name',
    targetAmount: 'target_amount',
    savedAmount: 'saved_amount',
    targetDate: 'target_date',
  },
  orderBy: 'target_date ASC, id ASC',
  fromRow: (row) => {
    return {
      id: row.id,
      name: row.name,
      targetAmount: row.target_amount,
      savedAmount: row.saved_amount,
      targetDate: row.target_date,
    };
  },
});
