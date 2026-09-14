import { createOwnedRecordRepository } from './ownedRecordRepository.js';

// What is owned. Largest first.
export const assetRepository = createOwnedRecordRepository({
  table: 'assets',
  fields: {
    name: 'name',
    kind: 'kind',
    value: 'value',
  },
  orderBy: 'value DESC, id ASC',
  fromRow: (row) => {
    return {
      id: row.id,
      name: row.name,
      kind: row.kind,
      value: row.value,
    };
  },
});
