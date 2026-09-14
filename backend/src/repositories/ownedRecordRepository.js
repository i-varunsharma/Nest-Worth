import db from '../database/db.js';

/*
  The shared base for tables of records that belong to one user: debts, goals,
  assets and family members.

  All four need the same five operations, and all four need the same security
  rule: every query filters on user_id as well as id, so nobody can read or
  change another person's row by guessing its id. Writing that rule once here
  means a new table cannot forget it.

  A repository built here is used like this:

    debtRepository.list(userId)
    debtRepository.create(userId, { name: 'Card', principal: 84000, ... })
    debtRepository.update(userId, id, values)   returns null if not theirs
    debtRepository.remove(userId, id)           returns false if not theirs

  Table and column names are written into the SQL strings. That is only safe
  because they come from the definitions in this folder, never from a request.
*/


/*
  definition:
    table    the table name
    fields   { appFieldName: 'column_name' } for every column the app can write
    orderBy  the ORDER BY for list()
    fromRow  turns one database row into the object the app uses
*/
export function createOwnedRecordRepository(definition) {
  const table = definition.table;
  const fromRow = definition.fromRow;

  const appFields = Object.keys(definition.fields);
  const columns = appFields.map((field) => {
    return definition.fields[field];
  });

  // Prepared once, when the server starts, and reused on every request.
  const listStatement = db.prepare(
    'SELECT * FROM ' + table + ' WHERE user_id = ? ORDER BY ' + definition.orderBy,
  );

  const findStatement = db.prepare(
    'SELECT * FROM ' + table + ' WHERE id = ? AND user_id = ?',
  );

  const countStatement = db.prepare(
    'SELECT COUNT(*) AS total FROM ' + table + ' WHERE user_id = ?',
  );

  const placeholders = columns.map(() => {
    return '?';
  });

  const insertStatement = db.prepare(
    'INSERT INTO ' + table + ' (user_id, ' + columns.join(', ') + ', created_at, updated_at) '
    + 'VALUES (?, ' + placeholders.join(', ') + ', ?, ?)',
  );

  const assignments = columns.map((column) => {
    return column + ' = ?';
  });

  const updateStatement = db.prepare(
    'UPDATE ' + table + ' SET ' + assignments.join(', ') + ', updated_at = ? '
    + 'WHERE id = ? AND user_id = ?',
  );

  const deleteStatement = db.prepare(
    'DELETE FROM ' + table + ' WHERE id = ? AND user_id = ?',
  );

  // The values in column order, ready to pass to a prepared statement. SQLite
  // has no boolean type, so true and false are stored as 1 and 0.
  function valuesInColumnOrder(values) {
    return appFields.map((field) => {
      const value = values[field];

      if (value === true) {
        return 1;
      }
      if (value === false) {
        return 0;
      }
      return value;
    });
  }

  function list(userId) {
    return listStatement.all(userId).map(fromRow);
  }

  function findById(userId, id) {
    const row = findStatement.get(id, userId);

    if (!row) {
      return null;
    }

    return fromRow(row);
  }

  function count(userId) {
    return countStatement.get(userId).total;
  }

  function create(userId, values) {
    const now = new Date().toISOString();
    const result = insertStatement.run(userId, ...valuesInColumnOrder(values), now, now);

    return findById(userId, result.lastInsertRowid);
  }

  function update(userId, id, values) {
    const now = new Date().toISOString();
    const result = updateStatement.run(...valuesInColumnOrder(values), now, id, userId);

    if (result.changes === 0) {
      return null;
    }

    return findById(userId, id);
  }

  function remove(userId, id) {
    const result = deleteStatement.run(id, userId);
    return result.changes > 0;
  }

  return { list, findById, count, create, update, remove };
}
