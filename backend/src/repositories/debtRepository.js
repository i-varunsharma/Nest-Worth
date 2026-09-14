import { createOwnedRecordRepository } from './ownedRecordRepository.js';

// What is owed. Listed highest rate first, the cheapest order to clear them in.
export const debtRepository = createOwnedRecordRepository({
  table: 'debts',
  fields: {
    name: 'name',
    kind: 'kind',
    principal: 'principal',
    annualRate: 'annual_rate',
    emi: 'emi',
  },
  orderBy: 'annual_rate DESC, id ASC',
  fromRow: (row) => {
    return {
      id: row.id,
      name: row.name,
      kind: row.kind,
      principal: row.principal,
      annualRate: row.annual_rate,
      emi: row.emi,
    };
  },
});
