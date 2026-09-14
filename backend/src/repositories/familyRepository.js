import { createOwnedRecordRepository } from './ownedRecordRepository.js';

// The people this salary supports, in the order they were added.
export const familyRepository = createOwnedRecordRepository({
  table: 'family_members',
  fields: {
    name: 'name',
    relation: 'relation',
    monthlySupport: 'monthly_support',
    hasHealthCover: 'has_health_cover',
  },
  orderBy: 'id ASC',
  fromRow: (row) => {
    return {
      id: row.id,
      name: row.name,
      relation: row.relation,
      monthlySupport: row.monthly_support,
      hasHealthCover: row.has_health_cover === 1,
    };
  },
});
